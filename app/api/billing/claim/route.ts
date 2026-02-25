import { NextResponse } from "next/server";
import { claimPendingPurchasesForUser, getUserById } from "@/lib/entitlements";
import { getCurrentUserFromSession } from "@/lib/server-auth";

export async function POST() {
  const sessionUser = await getCurrentUserFromSession();
  if (!sessionUser?.id) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const dbUser = await getUserById(sessionUser.id);
  if (!dbUser?._id) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const claimed = await claimPendingPurchasesForUser({
    userId: dbUser._id,
    email: dbUser.emailLower,
  });

  return NextResponse.json({ claimed });
}
