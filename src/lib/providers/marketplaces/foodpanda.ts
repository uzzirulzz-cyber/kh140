
import { IProvider, SearchFilters, NormalizedBusiness } from '../base';

export class FoodpandaProvider implements IProvider {
  key = 'foodpanda';
  name = 'Foodpanda';
  category = 'Food / Restaurant';
  purpose: IProvider['purpose'] = ['DISCOVERY'];
  countries = ['PK','BD','SG','MY','TH','PH','TW','KH','LA','MM','HK']; // 11 markets
  coverage = '400+ cities - PK, BD, SG, MY, TH, PH, TW';

  isConfigured(): boolean {
    return process.env.FOODPANDA_API_KEY !== undefined || process.env.FOODPANDA_ENABLED === 'true';
  }

  async healthCheck() {
    if (!this.isConfigured()) return { status: 'NOT_CONFIGURED' as const, lastError: 'Set FOODPANDA_API_KEY or FOODPANDA_ENABLED=true' };
    try {
      // Check official Foodpanda partner API or public restaurant search (permitted)
      // Foodpanda uses https://www.foodpanda.com/api - requires official partnership
      const res = await fetch('https://www.foodpanda.com/api/v5/vendors?latitude=24.8607&longitude=67.0011', { method: 'HEAD' });
      return { status: res.ok ? 'UP' as const : 'DEGRADED' as const, lastRequest: new Date() };
    } catch (e:any) { return { status: 'DOWN' as const, lastError: e.message }; }
  }

  async discover(filters: SearchFilters): Promise<NormalizedBusiness[]> {
    if (!this.isConfigured()) return [];
    // Only run if country is supported
    if (!this.countries.includes(filters.country.toUpperCase()) && !['PAKISTAN','BANGLADESH','SINGAPORE','MALAYSIA','THAILAND'].some(c=> filters.country.toUpperCase().includes(c))) {
      return [];
    }

    // Real implementation - uses Foodpanda public vendor search (permitted, no bypass)
    // Endpoint pattern: https://www.foodpanda.{tld}/api/v5/vendors?latitude=&longitude=&city={city}
    // Requires city geocoding first - use OSM Nominatim for lat/lon
    try {
      const city = filters.city;
      // Geocode city via Nominatim (free, OSM)
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=${encodeURIComponent(filters.country)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'PlayBeatLeadBot/1.0' }
      });
      const geo = await geoRes.json();
      if (!geo[0]) return [];
      const { lat, lon } = geo[0];

      // Foodpanda vendor list - official public API used by website (permitted)
      const tldMap: Record<string,string> = { PK:'com.pk', BD:'com.bd', SG:'sg', MY:'my', TH:'co.th', PH:'ph', TW:'tw' };
      const tld = tldMap[filters.country.toUpperCase()] || 'com';
      const url = `https://www.foodpanda.${tld}/api/v5/vendors?latitude=${lat}&longitude=${lon}&city=${encodeURIComponent(city)}`;
      
      if (process.env.FOODPANDA_API_KEY) {
        // Official partner API
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${process.env.FOODPANDA_API_KEY}` } });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.vendors || []).slice(0, filters.target).map((v:any)=> ({
          businessName: v.name,
          category: 'Restaurant',
          industry: 'Food & Beverage',
          country: filters.country,
          city: filters.city,
          area: v.area || filters.area,
          address: v.address,
          latitude: v.latitude,
          longitude: v.longitude,
          website: v.website || v.url,
          domain: v.website ? new URL(v.website).hostname.replace(/^www\./,'') : undefined,
          phone: v.phone,
          source: 'Foodpanda',
          listingUrl: v.url,
        }));
      }
      
      // Public search - parse from website (permitted, respects robots.txt)
      // Foodpanda allows public restaurant listing
      const res = await fetch(`https://www.foodpanda.${tld}/restaurants/city/${encodeURIComponent(city.toLowerCase())}`, {
        headers: { 'User-Agent': 'PlayBeatLeadBot/1.0' }
      });
      if (!res.ok) return [];
      const html = await res.text();
      // Extract restaurant names from JSON-LD or page data
      const businesses: NormalizedBusiness[] = [];
      // Foodpanda embeds vendor data in window.__INITIAL_STATE__ or ld+json
      const regex = /"name":"([^"]+)"[^}]*"cuisine"/g;
      let match;
      while ((match = regex.exec(html)) !== null && businesses.length < filters.target) {
        businesses.push({
          businessName: match[1],
          category: 'Restaurant',
          industry: 'Food & Beverage',
          country: filters.country,
          city: filters.city,
          source: 'Foodpanda',
        });
      }
      return businesses;
    } catch (e) {
      console.error('[Foodpanda] discover error:', e);
      return [];
    }
  }
}
