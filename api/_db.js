import { MongoClient } from 'mongodb';

let cached = global.mongo;
if (!cached) {
  cached = global.mongo = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    cached.promise = MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
      .then((client) => ({
        client,
        db: client.db(),
      }));
  }
  cached.conn = await cached.promise;
  return cached.conn;
} 