import { createHash, randomUUID } from "node:crypto";
import { Collection } from "mongodb";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";

export const GUEST_DAILY_LIMIT = 3;
export const FREE_WEEKLY_LIMIT = 10;
export const ANON_USAGE_COOKIE_NAME = "aio_anon";

type UsageCounterDocument = {
  key: string;
  count: number;
  resetAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type QuotaResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
};

let usageCounterIndexesReady = false;

function getUsageSalt() {
  const salt = process.env.USAGE_HASH_SALT ?? process.env.JWT_SECRET ?? "local-dev-usage-salt";
  return salt.trim();
}

function hashWithSalt(value: string) {
  return createHash("sha256").update(`${getUsageSalt()}:${value}`).digest("hex");
}

function getForwardedIp(request: Request) {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "";
  }
  return headers.get("x-real-ip") ?? "";
}

function getDayKey(now: Date) {
  return now.toISOString().slice(0, 10);
}

function getNextUtcDay(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

function getIsoWeekData(now: Date) {
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = utcDate.getUTCFullYear();

  const nextWeekStart = new Date(utcDate);
  nextWeekStart.setUTCDate(utcDate.getUTCDate() + (8 - (utcDate.getUTCDay() || 7)));
  nextWeekStart.setUTCHours(0, 0, 0, 0);

  return {
    key: `${year}-W${String(week).padStart(2, "0")}`,
    nextResetAt: nextWeekStart,
  };
}

async function getUsageCountersCollection(): Promise<Collection<UsageCounterDocument>> {
  const db = await getDb();
  const collection = db.collection<UsageCounterDocument>("usage_counters");

  if (!usageCounterIndexesReady) {
    try {
      await Promise.all([
        collection.createIndex({ key: 1 }, { unique: true, name: "usage_counter_key_unique" }),
        collection.createIndex({ resetAt: 1 }, { name: "usage_counter_reset_idx" }),
      ]);
    } catch (error) {
      console.error("[usage-limits] index setup failed:", error);
    }
    usageCounterIndexesReady = true;
  }

  return collection;
}

async function getCounterCount(key: string, now: Date) {
  const collection = await getUsageCountersCollection();
  const counter = await collection.findOne({ key });
  if (!counter) {
    return 0;
  }
  if (counter.resetAt.getTime() <= now.getTime()) {
    return 0;
  }
  return counter.count;
}

async function incrementCounter(key: string, resetAt: Date, now: Date) {
  const collection = await getUsageCountersCollection();
  const existing = await collection.findOne({ key });

  if (!existing || existing.resetAt.getTime() <= now.getTime()) {
    await collection.updateOne(
      { key },
      {
        $set: {
          count: 1,
          resetAt,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );
    return 1;
  }

  const nextCount = existing.count + 1;
  await collection.updateOne(
    { key },
    {
      $set: {
        count: nextCount,
        updatedAt: now,
      },
    },
  );
  return nextCount;
}

export async function getOrCreateAnonUsageId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(ANON_USAGE_COOKIE_NAME)?.value;
  if (existing) {
    return { anonId: existing, shouldSetCookie: false };
  }

  return {
    anonId: randomUUID(),
    shouldSetCookie: true,
  };
}

export function buildGuestUsageKeys(request: Request, anonId: string, now = new Date()) {
  const rawIp = getForwardedIp(request);
  const ipHash = rawIp ? hashWithSalt(rawIp) : "";
  const dayKey = getDayKey(now);
  const resetAt = getNextUtcDay(now);

  return {
    ipHash,
    resetAt,
    ipKey: ipHash ? `quota:guest:ip:${ipHash}:${dayKey}` : null,
    anonKey: `quota:guest:anon:${anonId}:${dayKey}`,
  };
}

export function buildFreeUserUsageKey(userId: string, now = new Date()) {
  const weekData = getIsoWeekData(now);
  return {
    key: `quota:user:${userId}:${weekData.key}`,
    resetAt: weekData.nextResetAt,
  };
}

export async function previewGuestQuota(params: { request: Request; anonId: string; now?: Date }) {
  const now = params.now ?? new Date();
  const { ipKey, anonKey, resetAt } = buildGuestUsageKeys(params.request, params.anonId, now);
  const [ipCount, anonCount] = await Promise.all([
    ipKey ? getCounterCount(ipKey, now) : Promise.resolve(0),
    getCounterCount(anonKey, now),
  ]);
  const used = Math.max(ipCount, anonCount);
  const remaining = Math.max(0, GUEST_DAILY_LIMIT - used);
  return {
    allowed: used < GUEST_DAILY_LIMIT,
    remaining,
    resetAt,
    limit: GUEST_DAILY_LIMIT,
  } satisfies QuotaResult;
}

export async function consumeGuestQuota(params: { request: Request; anonId: string; now?: Date }) {
  const now = params.now ?? new Date();
  const { ipKey, anonKey, resetAt } = buildGuestUsageKeys(params.request, params.anonId, now);
  const preview = await previewGuestQuota({ request: params.request, anonId: params.anonId, now });
  if (!preview.allowed) {
    return preview;
  }

  const [ipNextCount, anonNextCount] = await Promise.all([
    ipKey ? incrementCounter(ipKey, resetAt, now) : Promise.resolve(0),
    incrementCounter(anonKey, resetAt, now),
  ]);
  const used = Math.max(ipNextCount, anonNextCount);

  return {
    allowed: true,
    remaining: Math.max(0, GUEST_DAILY_LIMIT - used),
    resetAt,
    limit: GUEST_DAILY_LIMIT,
  } satisfies QuotaResult;
}

export async function previewFreeUserQuota(params: { userId: string; now?: Date }) {
  const now = params.now ?? new Date();
  const { key, resetAt } = buildFreeUserUsageKey(params.userId, now);
  const used = await getCounterCount(key, now);
  return {
    allowed: used < FREE_WEEKLY_LIMIT,
    remaining: Math.max(0, FREE_WEEKLY_LIMIT - used),
    resetAt,
    limit: FREE_WEEKLY_LIMIT,
  } satisfies QuotaResult;
}

export async function consumeFreeUserQuota(params: { userId: string; now?: Date }) {
  const now = params.now ?? new Date();
  const preview = await previewFreeUserQuota({ userId: params.userId, now });
  if (!preview.allowed) {
    return preview;
  }

  const { key, resetAt } = buildFreeUserUsageKey(params.userId, now);
  const used = await incrementCounter(key, resetAt, now);
  return {
    allowed: true,
    remaining: Math.max(0, FREE_WEEKLY_LIMIT - used),
    resetAt,
    limit: FREE_WEEKLY_LIMIT,
  } satisfies QuotaResult;
}
