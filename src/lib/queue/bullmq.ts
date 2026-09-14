
import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let connection: any = null;
export function getRedisConnection() {
  if (connection) return connection;
  connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(REDIS_URL.includes('upstash') || REDIS_URL.includes('rediss://') ? { tls: {} } : {})
  });
  connection.on('error', (err:any) => console.error('Redis error:', err.message));
  return connection;
}

export const CAMPAIGN_QUEUE = 'campaign-extraction';
let campaignQueue: any = null;
export function getCampaignQueue() {
  if (campaignQueue) return campaignQueue;
  try {
    campaignQueue = new Queue(CAMPAIGN_QUEUE, {
      connection: getRedisConnection(),
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 50 }
    });
  } catch { campaignQueue = null; }
  return campaignQueue;
}

let queueEvents: any = null;
export function getQueueEvents() {
  if (queueEvents) return queueEvents;
  try { queueEvents = new QueueEvents(CAMPAIGN_QUEUE, { connection: getRedisConnection() }); } catch { return null; }
  return queueEvents;
}

export async function addCampaignJob(data:any): Promise<string> {
  const queue = getCampaignQueue();
  if (!queue) throw new Error('QUEUE_NOT_AVAILABLE');
  const job = await queue.add(`extract-${data.campaignId}`, data, { jobId: data.campaignId, priority: 1 });
  return job.id || data.campaignId;
}
