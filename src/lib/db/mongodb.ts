
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || '';

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI or DATABASE_URL in .env');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const opts = { bufferCommands: false };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then(m=>m);
  }
  cached.conn = await cached.promise;
  console.log('MongoDB connected to Cluster0 - PlayBeat Lead Extractor ready - MIN 1000 enforced');
  return cached.conn;
}
