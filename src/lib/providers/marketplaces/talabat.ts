
import { IProvider, SearchFilters, NormalizedBusiness } from '../base';

export class TalabatProvider implements IProvider {
  key = 'talabat';
  name = 'Talabat';
  category = 'Food / Restaurant';
  purpose: IProvider['purpose'] = ['DISCOVERY'];
  countries = ['AE','KW','QA','BH','EG','OM','JO','IQ']; // 8 MENA
  coverage = 'AE, KW, QA, BH, EG, OM, JO, IQ - 8 MENA countries';

  isConfigured(): boolean {
    return process.env.TALABAT_API_KEY !== undefined || process.env.TALABAT_ENABLED === 'true';
  }

  async healthCheck() {
    if (!this.isConfigured()) return { status: 'NOT_CONFIGURED' as const };
    try {
      const res = await fetch('https://www.talabat.com/api/v5/vendors', { method: 'HEAD' });
      return { status: res.ok ? 'UP' as const : 'DEGRADED' as const, lastRequest: new Date() };
    } catch (e:any) { return { status: 'DOWN' as const, lastError: e.message }; }
  }

  async discover(filters: SearchFilters): Promise<NormalizedBusiness[]> {
    if (!this.isConfigured()) return [];
    if (!this.countries.includes(filters.country.toUpperCase())) return [];
    
    try {
      const city = filters.city;
      // Talabat uses https://www.talabat.com/{country}/api - official
      const countryCode = filters.country.toLowerCase() === 'united arab emirates' ? 'uae' : filters.country.toLowerCase();
      const tldMap: Record<string,string> = { AE:'uae', KW:'kuwait', QA:'qatar', BH:'bahrain', EG:'egypt', OM:'oman', JO:'jordan', IQ:'iraq' };
      const cc = tldMap[filters.country.toUpperCase()] || countryCode;
      
      // Geocode
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=${encodeURIComponent(filters.country)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'PlayBeatLeadBot/1.0' }
      });
      const geo = await geoRes.json();
      if (!geo[0]) return [];
      const { lat, lon } = geo[0];

      const url = `https://www.talabat.com/${cc}/api/v5/vendors?latitude=${lat}&longitude=${lon}`;
      const headers: any = { 'User-Agent': 'PlayBeatLeadBot/1.0' };
      if (process.env.TALABAT_API_KEY) headers['Authorization'] = `Bearer ${process.env.TALABAT_API_KEY}`;

      const res = await fetch(url, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.vendors || data.data?.vendors || []).slice(0, filters.target).map((v:any)=> ({
        businessName: v.name || v.vendor_name,
        category: 'Restaurant',
        industry: 'Food & Beverage',
        country: filters.country,
        city: filters.city,
        area: v.area,
        address: v.address,
        latitude: v.latitude || lat,
        longitude: v.longitude || lon,
        website: v.website,
        phone: v.phone,
        source: 'Talabat',
        listingUrl: v.url,
      }));
    } catch (e) {
      console.error('[Talabat] discover error:', e);
      return [];
    }
  }
}
