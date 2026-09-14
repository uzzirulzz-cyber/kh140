import dotenv from 'dotenv';
dotenv.config();
import { createOSMWorker } from './src/lib/queue/osmWorker';
import { connectDB } from './src/lib/db/mongodb';

async function main() {
  console.log('Starting PlayBeat Lead Extractor Worker - OSM + Atlas + BullMQ + Redis');
  console.log('Enforcing IMPORTANT RULES: MIN 1000, no duplicates, no fake data, CONFIRMED_PUBLIC_WHATSAPP only');
  await connectDB();
  const worker = createOSMWorker();
  console.log('Worker ready - waiting for campaigns from queue: campaign-extraction');
  console.log('Redis:', process.env.REDIS_URL || 'redis://localhost:6379');
  console.log('MongoDB: Cluster0 -', process.env.MONGODB_URI ? 'connected' : 'set MONGODB_URI');
  console.log('Overpass:', process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter');
  process.on('SIGTERM', async () => { await worker.close(); process.exit(0); });
}
main().catch(e=> { console.error(e); process.exit(1); });
