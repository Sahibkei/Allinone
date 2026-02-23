import { Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type UserDocument = {
  name: string;
  email: string;
  emailLower: string;
  passwordHash: string;
  emailVerified: boolean;
  verificationTokenHash: string | null;
  verificationTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
};

let indexesReady = false;

export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb();
  const users = db.collection<UserDocument>("users");

  if (!indexesReady) {
    await Promise.all([
      users.createIndex({ emailLower: 1 }, { unique: true, name: "email_lower_unique" }),
      users.createIndex(
        { verificationTokenHash: 1 },
        { sparse: true, name: "verification_token_hash_idx" },
      ),
    ]);
    indexesReady = true;
  }

  return users;
}
