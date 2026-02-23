import { createHash, randomBytes } from "node:crypto";
import { Collection, ObjectId } from "mongodb";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

type SessionDocument = {
  tokenHash: string;
  userId: ObjectId;
  email: string;
  name: string;
  createdAt: Date;
  expiresAt: Date;
};

type SessionUser = {
  id: string;
  email: string;
  name: string;
};

let indexesReady = false;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getSessionsCollection(): Promise<Collection<SessionDocument>> {
  const db = await getDb();
  const sessions = db.collection<SessionDocument>("sessions");

  if (!indexesReady) {
    await Promise.all([
      sessions.createIndex({ tokenHash: 1 }, { unique: true, name: "session_token_hash_unique" }),
      sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "session_expiry_ttl" }),
    ]);
    indexesReady = true;
  }

  return sessions;
}

export async function createSession(params: {
  userId: ObjectId;
  email: string;
  name: string;
}) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  const sessions = await getSessionsCollection();
  await sessions.insertOne({
    tokenHash,
    userId: params.userId,
    email: params.email,
    name: params.name,
    createdAt: now,
    expiresAt,
  });

  return {
    token,
    expiresAt,
  };
}

export async function getSessionUserByToken(token: string): Promise<SessionUser | null> {
  const tokenHash = hashToken(token);
  const sessions = await getSessionsCollection();

  const now = new Date();
  const session = await sessions.findOne({
    tokenHash,
    expiresAt: { $gt: now },
  });

  if (!session) {
    return null;
  }

  return {
    id: session.userId.toString(),
    email: session.email,
    name: session.name,
  };
}

export async function deleteSessionByToken(token: string) {
  const tokenHash = hashToken(token);
  const sessions = await getSessionsCollection();
  await sessions.deleteOne({ tokenHash });
}
