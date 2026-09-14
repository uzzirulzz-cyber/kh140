
# Free Worldwide Business Lead Generator - PlayBeat Lead Extractor

Production-ready, free-first lead generation platform. Every extraction starts at minimum 1000 unique leads.

## Architecture - OSM Primary

OpenStreetMap (Overpass) is primary free discovery engine, then business website as main source for emails and public WhatsApp evidence. This is cleaner than treating OpenCorporates as email DB.

### Source Categories
- Open Business Data: OSM, Overpass, OpenCorporates, Wikidata
- Food/Restaurant: Foodpanda (11 Asian markets, 400+ cities), Talabat (8 MENA countries), Uber Eats, DoorDash, Deliveroo, Zomato, Swiggy
- Ecommerce: Amazon (multi-marketplace), Amazon Business, noon (UAE, KSA, Egypt), eBay, Etsy, Daraz
- Property: Zameen (PK), Bayut, Property Finder, Dubizzle, Rightmove, Zoopla, Zillow, Redfin
- Hospitality: Booking.com, Tripadvisor (8M+ locations), Expedia, Agoda
- Directories: Yellow Pages, Yelp, Foursquare
- B2B Enrichment: Apollo, Hunter, Snov, Data Axle (disabled by default)

## Quick Start

```bash
cp .env.example .env
# Set DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npx prisma migrate dev
npm run dev
```

## Key Principles

- NO FAKE DATA: Zero leads when DB empty, no test@example.com
- CONFIRMED_PUBLIC_WHATSAPP only with wa.me evidence, never assume phone=WhatsApp
- SSRF protected: blocks localhost, 127.0.0.1, 10.x, 192.168.x, 169.254.169.254
- Target logic: continues through all permitted sources until 1000 unique or sources exhausted - never fabricates remaining 87
- Separation: 1000 businesses ≠ 1000 emails. Show coverage: Email 72.4%, WhatsApp 38.6%, Phone 88.1%

## API

POST /api/campaigns - create extraction (min 1000 enforced)
GET /api/leads?page=1&limit=20 - server pagination
GET /api/sources - provider health
POST /api/search - normalized search request

## Compliance

Only public business contact info or authorized APIs. Respects robots, terms, rate limits. Never bypass CAPTCHA/auth/paywall.
# kh140
