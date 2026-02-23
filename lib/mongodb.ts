import { MongoClient } from "mongodb";

let cachedClientPromise: Promise<MongoClient> | null = null;

function getMongoUri() {
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  const uri = rawUri.trim().replace(/^['"]|['"]$/g, "");
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://.");
  }

  if (uri.includes("<") || uri.includes(">")) {
    throw new Error("MONGODB_URI still contains placeholder values.");
  }

  return uri;
}

export async function getMongoClient() {
  if (cachedClientPromise) {
    return cachedClientPromise;
  }

  const client = new MongoClient(getMongoUri(), {
    serverSelectionTimeoutMS: 10000,
  });

  cachedClientPromise = client.connect().catch((error) => {
    // Allow the next request to retry if the first connection attempt failed.
    cachedClientPromise = null;
    throw error;
  });

  return cachedClientPromise;
}

export async function getDb() {
  const dbName = process.env.MONGODB_DB ?? "allinone";
  const client = await getMongoClient();
  return client.db(dbName);
}
