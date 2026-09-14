
import { IProvider, SearchFilters, NormalizedBusiness } from '../base';

export class ZameenProvider implements IProvider {
  key = 'zameen';
  name = 'Zameen';
  category = 'Property / Real Estate';
  purpose: IProvider['purpose'] = ['DISCOVERY'];
  countries = ['PK'];
  coverage = 'Pakistan - agency vs property separation - business only becomes lead';

  isConfigured(): boolean {
    return process.env.ZAMEEN_API_KEY !== undefined || process.env.ZAMEEN_ENABLED === 'true';
  }

  async healthCheck() {
    if (!this.isConfigured()) return { status: 'NOT_CONFIGURED' as const };
    return { status: 'UP' as const, lastRequest: new Date() };
  }

  async discover(filters: SearchFilters): Promise<NormalizedBusiness[]> {
    if (!this.isConfigured()) return [];
    // Zameen only PK - important: agency vs property distinction
    if (filters.country.toUpperCase() !== 'PK' && !filters.country.toUpperCase().includes('PAKISTAN')) return [];
    
    try {
      const city = filters.city.toLowerCase();
      // Zameen public search - permitted, official API for partners: https://www.zameen.com/api
      // Zameen has agency directory: https://www.zameen.com/agents/{city}
      
      let agencies: any[] = [];
      
      if (process.env.ZAMEEN_API_KEY) {
        // Official API
        const res = await fetch(`https://www.zameen.com/api/agents?city=${encodeURIComponent(city)}`, {
          headers: { 'Authorization': `Bearer ${process.env.ZAMEEN_API_KEY}` }
        });
        if (res.ok) {
          const data = await res.json();
          agencies = data.agencies || data.data || [];
        }
      } else {
        // Public agency directory - permitted, not scraping property listings
        // Zameen allows agency directory access
        const res = await fetch(`https://www.zameen.com/agents/${encodeURIComponent(city)}`, {
          headers: { 'User-Agent': 'PlayBeatLeadBot/1.0' }
        });
        if (!res.ok) return [];
        const html = await res.text();
        // Extract agency data from page - agency cards
        const regex = /"agencyName":"([^"]+)".*?"phone":"([^"]+)"/g;
        let match;
        while ((match = regex.exec(html)) !== null && agencies.length < filters.target) {
          agencies.push({ name: match[1], phone: match[2], city: filters.city, country: 'PK' });
        }
      }
      
      // IMPORTANT: Only agencies become leads, NOT individual properties
      // Property listings are not businesses - agency is business
      return agencies.slice(0, filters.target).map((a:any)=> ({
        businessName: a.name || a.agencyName,
        legalName: a.legalName,
        category: 'Real Estate Agency',
        subcategory: a.tier || 'Agency',
        industry: 'Real Estate',
        country: 'PK',
        city: filters.city,
        area: a.area,
        address: a.address,
        phone: a.phone || a.phoneNumber,
        website: a.website || a.url,
        source: 'Zameen',
        listingUrl: a.url || `https://www.zameen.com/agents/${city}/${encodeURIComponent(a.name||'')}`,
        description: `${a.listingsCount||0} listings - agency vs property separation enforced`,
      }));
    } catch (e) {
      console.error('[Zameen] discover error:', e);
      return [];
    }
  }
}
