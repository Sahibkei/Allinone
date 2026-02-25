import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type UserPlan = "free" | "day_pass" | "pro_monthly" | "pro_yearly";
export type UserPlanStatus = "active" | "past_due" | "canceled" | "expired";

export type UserDocument = {
  _id?: ObjectId;
  name: string;
  email: string;
  emailLower: string;
  passwordHash: string;
  emailVerified: boolean;
  verificationTokenHash: string | null;
  verificationTokenExpiresAt: Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  plan?: UserPlan;
  planStatus?: UserPlanStatus;
  planExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
};

let indexesReady = false;

export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb();
  const users = db.collection<UserDocument>("users");

  if (!indexesReady) {
    try {
      await Promise.all([
        users.createIndex({ emailLower: 1 }, { unique: true, name: "email_lower_unique" }),
        users.createIndex(
          { verificationTokenHash: 1 },
          { sparse: true, name: "verification_token_hash_idx" },
        ),
        users.createIndex({ stripeCustomerId: 1 }, { sparse: true, name: "stripe_customer_idx" }),
        users.createIndex(
          { stripeSubscriptionId: 1 },
          { sparse: true, name: "stripe_subscription_idx" },
        ),
      ]);
    } catch (error) {
      // Keep auth alive even when index creation is blocked in a deployment environment.
      console.error("[user-store] index setup failed:", error);
    }
    indexesReady = true;
  }

  return users;
}
