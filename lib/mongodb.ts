import { MongoClient } from "mongodb";

let cachedClientPromise: Promise<MongoClient> | null = null;

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }
  return uri;
}

export async function getMongoClient() {
  if (cachedClientPromise) {
    return cachedClientPromise;
  }

  const client = new MongoClient(getMongoUri());
  cachedClientPromise = client.connect();
  return cachedClientPromise;
}

export async function getDb() {
  const dbName = process.env.MONGODB_DB ?? "allinone";
  const client = await getMongoClient();
  return client.db(dbName);
}
