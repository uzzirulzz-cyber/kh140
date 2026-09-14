
import { IProvider, SearchFilters, NormalizedBusiness, ProviderHealth, normalizeDomain } from './base';

const OVERPASS = process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter';

export class OSMProvider implements IProvider {
  key = 'osm';
  name = 'OpenStreetMap';
  category = 'Open Business Data';
  purpose: IProvider['purpose'] = ['DISCOVERY','LOCATION','CATEGORY'];
  countries = undefined; // worldwide

  isConfigured(): boolean { return true; }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const r = await fetch(OVERPASS, { method: 'HEAD' });
      return { status: r.ok ? 'UP' : 'DEGRADED', lastRequest: new Date() };
    } catch (e: any) { return { status: 'DOWN', lastError: e.message }; }
  }

  async discover(filters: SearchFilters): Promise<NormalizedBusiness[]> {
    // Build Overpass QL - search for shops, amenities, offices matching keywords
    const kw = filters.keywords.join('|').toLowerCase();
    const city = filters.city.replace(/"/g,'');
    // Limit to 500 per request to respect API
    const query = `
[out:json][timeout:25];
area["name"="${city}"]->.a;
(
  node["shop"~"${kw}",i](area.a);
  node["amenity"~"${kw}",i](area.a);
  node["office"~"${kw}",i](area.a);
  way["shop"~"${kw}",i](area.a);
  way["amenity"~"${kw}",i](area.a);
);
out center 500;
`;
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query)
    });
    if (!res.ok) throw new Error(`OSM_OVERPASS_ERROR ${res.status}`);
    const data = await res.json();
    const results: NormalizedBusiness[] = [];
    for (const el of data.elements || []) {
      const tags = el.tags || {};
      const name = tags.name || tags['brand'] || 'Unknown Business';
      if (name === 'Unknown Business' && !tags.website) continue;
      results.push({
        businessName: name,
        category: tags.shop || tags.amenity || tags.office || filters.category || 'local business',
        industry: filters.industry,
        description: tags.description,
        country: filters.country,
        city: filters.city,
        area: filters.area,
        address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(' '),
        latitude: el.lat || el.center?.lat,
        longitude: el.lon || el.center?.lon,
        website: tags.website || tags['contact:website'],
        domain: normalizeDomain(tags.website || tags['contact:website']),
        phone: tags.phone || tags['contact:phone'],
        source: 'OpenStreetMap',
        sourceUrl: tags.website,
        confidence: 0.8
      });
    }
    return results.slice(0, filters.target);
  }
}
