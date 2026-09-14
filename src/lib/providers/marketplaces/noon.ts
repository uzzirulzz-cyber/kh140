
import { IProvider, SearchFilters, NormalizedBusiness } from '../base';

export class NoonProvider implements IProvider {
  key = 'noon';
  name = 'noon';
  category = 'Ecommerce / Marketplace';
  purpose: IProvider['purpose'] = ['DISCOVERY'];
  countries = ['AE','SA','EG'];
  coverage = 'AE, SA, EG + Global Selling program';

  isConfigured(): boolean {
    return process.env.NOON_API_KEY !== undefined || process.env.NOON_ENABLED === 'true';
  }

  async healthCheck() {
    if (!this.isConfigured()) return { status: 'NOT_CONFIGURED' as const };
    try {
      const res = await fetch('https://www.noon.com/api', { method: 'HEAD' });
      return { status: 'DEGRADED' as const, lastRequest: new Date() }; // Noon has no public API - requires seller API
    } catch (e:any) { return { status: 'DOWN' as const, lastError: e.message }; }
  }

  async discover(filters: SearchFilters): Promise<NormalizedBusiness[]> {
    if (!this.isConfigured()) return [];
    if (!this.countries.includes(filters.country.toUpperCase()) && !['UNITED ARAB EMIRATES','SAUDI ARABIA','EGYPT'].includes(filters.country.toUpperCase())) return [];
    
    try {
      // Noon Seller API - official: https://seller.noon.com/
      // Requires Noon Seller Center API key - B2B sellers
      // Noon.com marketplace search is not officially supported for scraping - use seller API
      if (!process.env.NOON_API_KEY) return [];
      
      const countryMap: Record<string,string> = { AE:'ae-en', SA:'sa-en', EG:'eg-en' };
      const locale = countryMap[filters.country.toUpperCase()] || 'ae-en';
      
      // Example: Noon catalog API (requires auth)
      const url = `https://api.noon.com/${locale}/catalog/search?q=${encodeURIComponent(filters.keywords[0]||'electronics')}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${process.env.NOON_API_KEY}`, 'User-Agent': 'PlayBeatLeadBot/1.0' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.products || []).slice(0, filters.target).map((p:any)=> ({
        businessName: p.seller_name || p.brand,
        category: p.category,
        industry: 'Ecommerce',
        country: filters.country,
        city: filters.city,
        source: 'noon',
        website: p.seller_url,
        listingUrl: `https://www.noon.com/${locale}/${p.url}`,
      }));
    } catch (e) {
      console.error('[noon] discover error:', e);
      return [];
    }
  }
}
