import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { type UserDocument, type UserPlan, type UserPlanStatus, getUsersCollection } from "@/lib/user-store";

type ProcessedStripeEventDocument = {
  _id?: ObjectId;
  stripeEventId: string;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PendingPurchaseDocument = {
  _id?: ObjectId;
  email: string;
  emailLower: string;
  plan: UserPlan;
  planStatus: UserPlanStatus;
  planExpiresAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  claimedAt: Date | null;
  claimedByUserId: ObjectId | null;
};

export type EntitlementSnapshot = {
  plan: UserPlan;
  planStatus: UserPlanStatus;
  planExpiresAt: Date | null;
  hasUnlimitedAccess: boolean;
};

export type PricePlanMatch = {
  plan: UserPlan;
  planStatus: UserPlanStatus;
  planExpiresAt: Date | null;
};

type EntitlementUpdateInput = {
  plan: UserPlan;
  planStatus: UserPlanStatus;
  planExpiresAt: Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};

let processedEventsIndexesReady = false;
let pendingPurchaseIndexesReady = false;

function trimOrNull(value?: string | null) {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function toObjectId(value: string | ObjectId) {
  if (value instanceof ObjectId) {
    return value;
  }
  if (!ObjectId.isValid(value)) {
    throw new Error("Invalid ObjectId value.");
  }
  return new ObjectId(value);
}

function normalizePlan(value?: string | null): UserPlan {
  if (value === "day_pass" || value === "pro_monthly" || value === "pro_yearly") {
    return value;
  }
  return "free";
}

function normalizePlanStatus(value?: string | null): UserPlanStatus {
  if (value === "past_due" || value === "canceled" || value === "expired") {
    return value;
  }
  return "active";
}

export function getEntitlementSnapshot(user: UserDocument | null, now = new Date()): EntitlementSnapshot {
  if (!user) {
    return {
      plan: "free",
      planStatus: "active",
      planExpiresAt: null,
      hasUnlimitedAccess: false,
    };
  }

  const plan = normalizePlan(user.plan);
  const planStatus = normalizePlanStatus(user.planStatus);
  const planExpiresAt = user.planExpiresAt ?? null;

  const isPaidSubscription = (plan === "pro_monthly" || plan === "pro_yearly") && planStatus === "active";
  const dayPassIsCurrentlyActive =
    plan === "day_pass" &&
    planStatus === "active" &&
    !!planExpiresAt &&
    planExpiresAt.getTime() > now.getTime();
  const normalizedStatus =
    plan === "day_pass" &&
    planStatus === "active" &&
    (!!planExpiresAt ? planExpiresAt.getTime() <= now.getTime() : true)
      ? "expired"
      : planStatus;

  return {
    plan,
    planStatus: normalizedStatus,
    planExpiresAt,
    hasUnlimitedAccess: isPaidSubscription || dayPassIsCurrentlyActive,
  };
}

export function mapStripePriceIdToPlan(priceId: string | null, purchasedAt: Date): PricePlanMatch | null {
  if (!priceId) {
    return null;
  }

  const day = trimOrNull(process.env.STRIPE_PRICE_DAY);
  const monthly = trimOrNull(process.env.STRIPE_PRICE_MONTHLY);
  const yearly = trimOrNull(process.env.STRIPE_PRICE_YEARLY);

  if (day && priceId === day) {
    return {
      plan: "day_pass",
      planStatus: "active",
      planExpiresAt: new Date(purchasedAt.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  if (monthly && priceId === monthly) {
    return {
      plan: "pro_monthly",
      planStatus: "active",
      planExpiresAt: null,
    };
  }

  if (yearly && priceId === yearly) {
    return {
      plan: "pro_yearly",
      planStatus: "active",
      planExpiresAt: null,
    };
  }

  return null;
}

async function getProcessedStripeEventsCollection(): Promise<Collection<ProcessedStripeEventDocument>> {
  const db = await getDb();
  const collection = db.collection<ProcessedStripeEventDocument>("processed_stripe_events");

  if (!processedEventsIndexesReady) {
    try {
      await collection.createIndex(
        { stripeEventId: 1 },
        { unique: true, name: "processed_stripe_event_id_unique" },
      );
    } catch (error) {
      console.error("[entitlements] processed events index setup failed:", error);
    }
    processedEventsIndexesReady = true;
  }

  return collection;
}

async function getPendingPurchasesCollection(): Promise<Collection<PendingPurchaseDocument>> {
  const db = await getDb();
  const collection = db.collection<PendingPurchaseDocument>("pending_purchases");

  if (!pendingPurchaseIndexesReady) {
    try {
      await Promise.all([
        collection.createIndex(
          { emailLower: 1, claimedByUserId: 1, createdAt: 1 },
          { name: "pending_purchase_claim_lookup" },
        ),
        collection.createIndex({ stripeCustomerId: 1 }, { sparse: true, name: "pending_customer_idx" }),
        collection.createIndex(
          { stripeSubscriptionId: 1 },
          { sparse: true, name: "pending_subscription_idx" },
        ),
      ]);
    } catch (error) {
      console.error("[entitlements] pending purchase index setup failed:", error);
    }
    pendingPurchaseIndexesReady = true;
  }

  return collection;
}

function entitlementUpdateToSetDocument(input: EntitlementUpdateInput) {
  return {
    plan: input.plan,
    planStatus: input.planStatus,
    planExpiresAt: input.planExpiresAt,
    stripeCustomerId: trimOrNull(input.stripeCustomerId) ?? null,
    stripeSubscriptionId: trimOrNull(input.stripeSubscriptionId) ?? null,
    updatedAt: new Date(),
  };
}

export async function getUserById(userId: string | ObjectId) {
  const users = await getUsersCollection();
  return users.findOne({ _id: toObjectId(userId) });
}

export async function applyEntitlementToUserById(
  userId: string | ObjectId,
  entitlement: EntitlementUpdateInput,
) {
  const users = await getUsersCollection();
  await users.updateOne(
    { _id: toObjectId(userId) },
    {
      $set: entitlementUpdateToSetDocument(entitlement),
    },
  );
}

export async function applyEntitlementByEmailOrCreatePending(params: {
  email: string;
  entitlement: EntitlementUpdateInput;
}) {
  const email = params.email.trim();
  const emailLower = email.toLowerCase();
  const users = await getUsersCollection();
  const user = await users.findOne({ emailLower });

  if (user?._id) {
    await applyEntitlementToUserById(user._id, params.entitlement);
    return { appliedToUser: true as const, userId: user._id };
  }

  const pendingPurchases = await getPendingPurchasesCollection();
  const now = new Date();
  await pendingPurchases.insertOne({
    email,
    emailLower,
    plan: params.entitlement.plan,
    planStatus: params.entitlement.planStatus,
    planExpiresAt: params.entitlement.planExpiresAt,
    stripeCustomerId: trimOrNull(params.entitlement.stripeCustomerId),
    stripeSubscriptionId: trimOrNull(params.entitlement.stripeSubscriptionId),
    createdAt: now,
    updatedAt: now,
    claimedAt: null,
    claimedByUserId: null,
  });

  return { appliedToUser: false as const };
}

export async function claimPendingPurchasesForUser(params: {
  userId: string | ObjectId;
  email: string;
}) {
  const userId = toObjectId(params.userId);
  const emailLower = params.email.trim().toLowerCase();
  const pendingPurchases = await getPendingPurchasesCollection();

  const pendingRows = await pendingPurchases
    .find({ emailLower, claimedByUserId: null })
    .sort({ createdAt: 1 })
    .toArray();

  if (!pendingRows.length) {
    return false;
  }

  for (const pending of pendingRows) {
    await applyEntitlementToUserById(userId, {
      plan: pending.plan,
      planStatus: pending.planStatus,
      planExpiresAt: pending.planExpiresAt,
      stripeCustomerId: pending.stripeCustomerId,
      stripeSubscriptionId: pending.stripeSubscriptionId,
    });

    await pendingPurchases.updateOne(
      { _id: pending._id },
      {
        $set: {
          claimedByUserId: userId,
          claimedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
  }

  return true;
}

export async function beginStripeEventProcessing(stripeEventId: string) {
  const collection = await getProcessedStripeEventsCollection();
  const existing = await collection.findOne({ stripeEventId });

  if (existing?.processedAt) {
    return false;
  }

  if (!existing) {
    const now = new Date();
    try {
      await collection.insertOne({
        stripeEventId,
        processedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      // Another worker may create the row first. Continue as idempotent processing.
    }
  } else {
    await collection.updateOne(
      { stripeEventId },
      {
        $set: {
          updatedAt: new Date(),
        },
      },
    );
  }

  return true;
}

export async function markStripeEventProcessed(stripeEventId: string) {
  const collection = await getProcessedStripeEventsCollection();
  await collection.updateOne(
    { stripeEventId },
    {
      $set: {
        processedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );
}

export async function updateUserEntitlementByStripeRefs(params: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  updates: Partial<Pick<UserDocument, "plan" | "planStatus" | "planExpiresAt" | "stripeSubscriptionId">>;
}) {
  const customerId = trimOrNull(params.stripeCustomerId);
  const subscriptionId = trimOrNull(params.stripeSubscriptionId);
  if (!customerId && !subscriptionId) {
    return 0;
  }

  const users = await getUsersCollection();
  const matchConditions = [];
  if (customerId) {
    matchConditions.push({ stripeCustomerId: customerId });
  }
  if (subscriptionId) {
    matchConditions.push({ stripeSubscriptionId: subscriptionId });
  }

  const result = await users.updateMany(
    { $or: matchConditions },
    {
      $set: {
        ...params.updates,
        updatedAt: new Date(),
      },
    },
  );

  return result.modifiedCount;
}

export async function expireDayPassByStripeCustomer(stripeCustomerId: string | null | undefined) {
  const customerId = trimOrNull(stripeCustomerId);
  if (!customerId) {
    return 0;
  }

  const users = await getUsersCollection();
  const result = await users.updateMany(
    {
      stripeCustomerId: customerId,
      plan: "day_pass",
    },
    {
      $set: {
        plan: "free",
        planStatus: "expired",
        planExpiresAt: null,
        updatedAt: new Date(),
      },
    },
  );

  return result.modifiedCount;
}

export function toPlanLabel(snapshot: EntitlementSnapshot) {
  if (snapshot.plan === "pro_monthly" || snapshot.plan === "pro_yearly") {
    if (snapshot.planStatus === "active") return "Pro";
    if (snapshot.planStatus === "past_due") return "Past due";
    return "Free";
  }

  if (snapshot.plan === "day_pass") {
    if (snapshot.hasUnlimitedAccess) return "Day Pass";
    return "Expired";
  }

  return "Free";
}
