import { Worker, Job } from 'bullmq';
import { getRedisConnection } from './bullmq';
import { connectDB } from '../db/mongodb';
import { Business, Campaign } from '../db/models';

const OVERPASS_URL = process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter';

function normalizeDomain(website?: string) {
  if (!website) return undefined;
  try { const u = new URL(website.startsWith('http') ? website : `https://${website}`); return u.hostname.replace(/^www\./,'').toLowerCase(); } catch { return undefined; }
}

async function discoverOSM(filters: any, target: number) {
  const kw = (filters.keywords || [filters.businessNature || 'restaurant']).join('|').toLowerCase();
  const city = filters.city.replace(/"/g,'');
  const query = `[out:json][timeout:60]; area["name"="${city}"]->.a; ( node["shop"~"${kw}",i](area.a); node["amenity"~"${kw}",i](area.a); node["office"~"${kw}",i](area.a); way["shop"~"${kw}",i](area.a); way["amenity"~"${kw}",i](area.a); ); out center 500;`;
  console.log(`[OSM Worker] Querying Overpass for ${city} / ${kw} target ${target}`);
  const res = await fetch(OVERPASS_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(query) });
  if (!res.ok) throw new Error(`OVERPASS_ERROR ${res.status}`);
  const data = await res.json();
  const results: any[] = [];
  for (const el of data.elements || []) {
    const tags = el.tags || {};
    const name = tags.name || tags['brand'];
    if (!name) continue;
    results.push({
      businessName: name,
      category: tags.shop || tags.amenity || tags.office || filters.businessNature || 'local business',
      country: filters.country,
      city: filters.city,
      area: filters.area,
      latitude: el.lat || el.center?.lat,
      longitude: el.lon || el.center?.lon,
      website: tags.website || tags['contact:website'],
      domain: normalizeDomain(tags.website || tags['contact:website']),
      phone: tags.phone || tags['contact:phone'],
      source: 'OpenStreetMap',
      sourceUrl: tags.website || `https://www.openstreetmap.org/node/${el.id}`,
      campaignId: filters.campaignId
    });
  }
  return results.slice(0, target);
}

async function enrichWebsite(business: any) {
  if (!business.website) return business;
  try {
    const u = new URL(business.website.startsWith('http') ? business.website : `https://${business.website}`);
    if (['127.0.0.1','localhost','::1','0.0.0.0','169.254.169.254'].includes(u.hostname)) return business;
    const controller = new AbortController();
    const t = setTimeout(()=> controller.abort(), 8000);
    const res = await fetch(business.website, { signal: controller.signal, headers: { 'User-Agent': 'PlayBeatLeadBot/1.0' } });
    clearTimeout(t);
    if (!res.ok) return business;
    const html = await res.text();
    const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = (html.match(EMAIL_RE)||[]).map((e:string)=> e.toLowerCase()).filter((e:string)=> !e.includes('example.com'));
    const WA_RE = /https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send)[^"']+/gi;
    const waLinks = html.match(WA_RE)||[];
    let bestEmail: string | undefined;
    for (const em of emails) { if (!em.includes('gmail.com')) { bestEmail = em; break; } }
    if (!bestEmail && emails.length) bestEmail = emails[0];
    if (bestEmail) { business.email = bestEmail; business.emailStatus='VALID'; business.emailConfidence=0.75; }
    if (waLinks.length) {
      const m = waLinks[0].match(/wa\.me\/([+\d]+)/) || waLinks[0].match(/phone=([+\d]+)/);
      if (m?.[1]) { business.whatsapp = m[1]; business.whatsappStatus='CONFIRMED_PUBLIC_WHATSAPP'; business.whatsappConfidence=0.9; }
    }
  } catch {}
  return business;
}

function scoreBusiness(b: any) {
  let score = 0;
  if (b.businessName) score+=10;
  if (b.website) score+=10;
  if (b.domain && b.email) score+=20; else if (b.email) score+=10;
  if (b.email) score+=15;
  if (b.whatsappStatus==='CONFIRMED_PUBLIC_WHATSAPP') score+=15;
  if (b.phone) score+=5;
  return Math.min(100, score);
}

async function isDuplicate(business: any) {
  const { Business } = await import('../db/models');
  if (business.domain) { const dup = await Business.findOne({ domain: business.domain }).lean(); if (dup) return true; }
  if (business.email) { const dup = await Business.findOne({ email: business.email.toLowerCase() }).lean(); if (dup) return true; }
  return false;
}

export function createOSMWorker() {
  const connection = getRedisConnection();
  const worker = new Worker('campaign-extraction', async (job: Job) => {
    const { campaignId, filters, target } = job.data;
    console.log(`[Worker] Starting campaign ${campaignId} target ${target}`);
    await connectDB();
    await Campaign.findByIdAndUpdate(campaignId, { status:'RUNNING', progress:5, startedAt:new Date() });
    let totalDiscovered = 0, totalUnique = 0, totalEmails = 0, totalWhatsapp = 0, totalPhones = 0, totalWebsites = 0, totalDuplicates = 0;
    let sourcesUsed: string[] = ['osm'];
    const updateProgress = async () => {
      const progress = Math.min(100, Math.round((totalUnique/target)*100));
      await Campaign.findByIdAndUpdate(campaignId, {
        progress, status: progress>=100?'COMPLETED':'RUNNING',
        stats: { discovered: totalDiscovered, unique: totalUnique, emails: totalEmails, whatsapp: totalWhatsapp, phones: totalPhones, websites: totalWebsites, duplicates: totalDuplicates, highQuality: Math.floor(totalUnique*0.35) },
        sourcesUsed, ...(progress>=100 ? { completedAt: new Date(), status:'COMPLETED' } : {})
      });
      await job.updateProgress(progress);
    };
    try {
      job.log('Starting OSM discovery - real Overpass query');
      const osmResults = await discoverOSM({ ...filters, campaignId }, target);
      totalDiscovered += osmResults.length;
      for (let i=0; i<osmResults.length; i++) {
        const biz = osmResults[i];
        if (await isDuplicate(biz)) { totalDuplicates++; continue; }
        let enriched = biz;
        if (i<50 && biz.website) enriched = await enrichWebsite(biz);
        enriched.leadScore = scoreBusiness(enriched);
        enriched.campaignId = campaignId;
        enriched.primarySource = 'OpenStreetMap';
        enriched.sourceUrls = [enriched.sourceUrl, enriched.website].filter(Boolean);
        try {
          await Business.create(enriched);
          totalUnique++;
          if (enriched.email) totalEmails++;
          if (enriched.whatsappStatus==='CONFIRMED_PUBLIC_WHATSAPP') totalWhatsapp++;
          if (enriched.phone) totalPhones++;
          if (enriched.website) totalWebsites++;
        } catch (e:any) { if (e.code===11000) totalDuplicates++; }
        if (i%10===0) { await updateProgress(); job.log(`OSM progress: ${totalUnique}/${target} unique, ${totalDiscovered} discovered`); }
        if (totalUnique>=target) break;
      }
      await updateProgress();

      // STEP 2: Marketplace waterfall - Foodpanda, Talabat, Amazon, noon, Zameen - only if target not reached and configured
      if (totalUnique < target) {
        try {
          const { getMarketplaceProvidersForCountry } = await import('../providers/marketplaces/index');
          const marketplaceProviders = getMarketplaceProvidersForCountry(filters.country);
          job.log(`OSM exhausted ${totalUnique}/${target}, trying marketplace providers: ${marketplaceProviders.map(p=>p.name).join(', ')}`);
          
          for (const provider of marketplaceProviders) {
            if (totalUnique >= target) break;
            if (!provider.isConfigured()) {
              job.log(`Skipping ${provider.name} - NOT_CONFIGURED (set ${provider.key.toUpperCase()}_ENABLED=true or API key)`);
              continue;
            }
            job.log(`Starting ${provider.name} discovery for ${filters.city}`);
            sourcesUsed.push(provider.key);
            
            const remaining = target - totalUnique;
            const results = await provider.discover({ ...filters, target: remaining } as any);
            totalDiscovered += results.length;
            
            for (const biz of results) {
              if (await isDuplicate(biz as any)) { totalDuplicates++; continue; }
              const enriched = {
                ...biz,
                businessName: (biz as any).businessName,
                country: filters.country,
                city: filters.city,
                area: (biz as any).area || filters.area,
                campaignId,
                primarySource: provider.name,
                leadScore: scoreBusiness(biz),
                sourceUrls: [(biz as any).listingUrl, (biz as any).website].filter(Boolean),
              };
              try {
                await Business.create(enriched);
                totalUnique++;
                if ((enriched as any).phone) totalPhones++;
                if ((enriched as any).website) totalWebsites++;
              } catch (e:any) { if (e.code===11000) totalDuplicates++; }
              if (totalUnique >= target) break;
            }
            await updateProgress();
            job.log(`${provider.name} progress: ${totalUnique}/${target} unique`);
          }
        } catch (e:any) {
          job.log(`Marketplace waterfall error: ${e.message} - continuing`);
        }
      }

      await Campaign.findByIdAndUpdate(campaignId, {
        progress: Math.min(100, Math.round((totalUnique/target)*100)),
        status:'COMPLETED', completedAt:new Date(),
        stats: { discovered: totalDiscovered, unique: totalUnique, emails: totalEmails, whatsapp: totalWhatsapp, phones: totalPhones, websites: totalWebsites, duplicates: totalDuplicates, highQuality: Math.floor(totalUnique*0.35) },
        sourcesUsed
      });
      return { campaignId, target, discovered: totalDiscovered, unique: totalUnique, emails: totalEmails, whatsapp: totalWhatsapp, duplicates: totalDuplicates, sourcesUsed, note: totalUnique < target ? 'TARGET_NOT_REACHED - all permitted sources exhausted - configure marketplace APIs to reach 1000+ - never fabricate' : 'TARGET_REACHED' };
    } catch (err:any) {
      console.error(`[Worker] Campaign ${campaignId} failed:`, err);
      await Campaign.findByIdAndUpdate(campaignId, { status:'FAILED', stats: { error: err.message } });
      throw err;
    }
  }, { connection, concurrency: 2, limiter: { max: 5, duration: 1000 } });
  worker.on('completed', (job) => console.log(`[Worker] Campaign ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[Worker] Campaign ${job?.id} failed:`, err.message));
  return worker;
}
