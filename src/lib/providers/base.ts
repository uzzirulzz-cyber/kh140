
export type BusinessNature = 'B2B'|'B2C'|'RETAIL'|'SERVICE'|'MANUFACTURER'|'DISTRIBUTOR'|'AGENCY'|'ECOMMERCE'|'STARTUP'|'LOCAL'|'ONLINE'|string;

export interface SearchFilters {
  country: string;
  state?: string;
  city: string;
  area?: string;
  postalCode?: string;
  radiusKm?: number;
  businessNature?: string;
  industry?: string;
  category?: string;
  subcategory?: string;
  keywords: string[];
  target: number; // 100,250,500,1000,2500,5000,10000
  hasEmail?: boolean;
  hasWebsite?: boolean;
  hasWhatsApp?: boolean;
  minLeadScore?: number;
}

export interface NormalizedBusiness {
  businessName: string;
  legalName?: string;
  description?: string;
  industry?: string;
  category?: string;
  subcategory?: string;
  country: string;
  state?: string;
  city: string;
  area?: string;
  postalCode?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  domain?: string;
  phone?: string;
  email?: string;
  listingUrl?: string;
  source: string;
  sourceUrl?: string;
  confidence?: number;
}

export interface ProviderHealth { status: 'UP'|'DEGRADED'|'RATE_LIMITED'|'DOWN'|'NOT_CONFIGURED'; lastRequest?: Date; lastSuccess?: Date; lastError?: string; avgMs?: number; }

export interface IProvider {
  key: string;
  name: string;
  category: string;
  purpose: ('DISCOVERY'|'CONTACT'|'ENRICHMENT'|'VALIDATION'|'CATEGORY'|'LOCATION')[];
  countries?: string[]; // coverage hint
  isConfigured(): boolean;
  healthCheck(): Promise<ProviderHealth>;
  discover(filters: SearchFilters): Promise<NormalizedBusiness[]>;
  getQuota?(): Promise<{ used: number; limit: number } | null>;
  close?(): Promise<void>;
}

export function normalizeDomain(website?: string): string | undefined {
  if (!website) return undefined;
  try {
    const u = new URL(website.startsWith('http') ? website : `https://${website}`);
    return u.hostname.replace(/^www\./,'').toLowerCase();
  } catch { return undefined; }
}
