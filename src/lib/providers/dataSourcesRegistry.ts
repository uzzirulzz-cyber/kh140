
import { PUBLIC_APIS } from './publicApis';

export interface DataSource {
  key: string;
  name: string;
  category: string;
  url: string;
  description: string;
  auth: string;
  purpose: string[];
  status: 'ACTIVE'|'NOT_CONFIGURED'|'DEGRADED'|'RATE_LIMITED';
  free: boolean;
  priority: number;
  coverage?: string;
}

export function getAllDataSources(): DataSource[] {
  const freeFirst: DataSource[] = [
    { key:'osm', name:'OpenStreetMap / Overpass', category:'Open Business Data', url:'https://wiki.openstreetmap.org/wiki/Overpass_API', description:'Primary free discovery engine - worldwide business nodes, shops, amenities', auth:'No', purpose:['DISCOVERY','LOCATION','CATEGORY'], status:'ACTIVE', free:true, priority:1, coverage:'Worldwide' },
    { key:'opencorporates', name:'OpenCorporates', category:'Open Business Data', url:'https://api.opencorporates.com/', description:'Company registry - 200M+ companies', auth:'apiKey', purpose:['DISCOVERY'], status:'NOT_CONFIGURED', free:false, priority:2, coverage:'130+ jurisdictions' },
    { key:'uk_companies_house', name:'UK Companies House', category:'Open Data', url:'https://developer.company-information.service.gov.uk/', description:'UK company data', auth:'OAuth', purpose:['DISCOVERY'], status:'NOT_CONFIGURED', free:true, priority:3, coverage:'UK' },
    { key:'open_gov_usa', name:'Open Government USA', category:'Open Data', url:'https://www.data.gov/', description:'U.S. government open data', auth:'No', purpose:['DISCOVERY'], status:'ACTIVE', free:true, priority:4, coverage:'USA' },
  ];

  const fromCSV = PUBLIC_APIS.map((api:any, idx:number)=> ({
    key: api.key,
    name: api.name,
    category: api.category,
    url: api.url,
    description: api.description,
    auth: api.auth,
    purpose: api.purpose,
    status: api.free ? 'ACTIVE' as const : 'NOT_CONFIGURED' as const,
    free: api.free,
    priority: 10+idx,
    coverage: api.category
  }));

  return [...freeFirst, ...fromCSV].sort((a,b)=> a.priority - b.priority);
}

export function getSourcesForCountry(country: string) {
  const all = getAllDataSources();
  const countryMap: Record<string,string[]> = {
    PK: ['osm','zameen','foodpanda','daraz','open_gov'],
    AE: ['osm','talabat','noon','amazon','bayut','propertyfinder'],
    SA: ['osm','noon','bayut','amazon','talabat'],
    US: ['osm','open_gov_usa','yelp','zillow','amazon'],
    UK: ['osm','uk_companies_house','rightmove','zoopla','tripadvisor'],
    IN: ['osm','zomato','swiggy','magicbricks','99acres'],
  };
  const codes = countryMap[country.toUpperCase()] || ['osm'];
  return all.filter(s=> s.free || codes.some(c=> s.key.includes(c) || s.name.toLowerCase().includes(c)));
}
