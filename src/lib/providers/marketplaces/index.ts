
import { FoodpandaProvider } from './foodpanda';
import { TalabatProvider } from './talabat';
import { AmazonProvider } from './amazon';
import { NoonProvider } from './noon';
import { ZameenProvider } from './zameen';

export const MARKETPLACE_PROVIDERS = [
  new FoodpandaProvider(),
  new TalabatProvider(),
  new AmazonProvider(),
  new NoonProvider(),
  new ZameenProvider(),
];

export function getMarketplaceProvidersForCountry(country: string) {
  const upper = country.toUpperCase();
  return MARKETPLACE_PROVIDERS.filter(p=> {
    if (!p.countries) return true; // worldwide like Amazon
    return p.countries.includes(upper) || p.countries.some(c=> upper.includes(c));
  });
}
