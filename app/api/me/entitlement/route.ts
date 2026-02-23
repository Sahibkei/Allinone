import { NextResponse } from "next/server";
import { getEntitlementSnapshot } from "@/lib/entitlements";
import { getCurrentUserFromSession } from "@/lib/server-auth";
import { getUserById } from "@/lib/entitlements";
import {
  ANON_USAGE_COOKIE_NAME,
  getOrCreateAnonUsageId,
  previewFreeUserQuota,
  previewGuestQuota,
} from "@/lib/usage-limits";

export async function GET(request: Request) {
  const sessionUser = await getCurrentUserFromSession();

  if (sessionUser?.id) {
    const dbUser = await getUserById(sessionUser.id);
    const snapshot = getEntitlementSnapshot(dbUser);

    if (snapshot.hasUnlimitedAccess) {
      return NextResponse.json({
        authenticated: true,
        plan: snapshot.plan,
        planStatus: snapshot.planStatus,
        planExpiresAt: snapshot.planExpiresAt?.toISOString() ?? null,
        usageRemaining: null,
        resetAt: snapshot.plan === "day_pass" ? snapshot.planExpiresAt?.toISOString() ?? null : null,
      });
    }

    const quota = await previewFreeUserQuota({ userId: sessionUser.id });
    return NextResponse.json({
      authenticated: true,
      plan: snapshot.plan,
      planStatus: snapshot.planStatus,
      planExpiresAt: snapshot.planExpiresAt?.toISOString() ?? null,
      usageRemaining: quota.remaining,
      resetAt: quota.resetAt.toISOString(),
    });
  }

  const anon = await getOrCreateAnonUsageId();
  const quota = await previewGuestQuota({ request, anonId: anon.anonId });
  const response = NextResponse.json({
    authenticated: false,
    plan: "free",
    planStatus: "active",
    planExpiresAt: null,
    usageRemaining: quota.remaining,
    resetAt: quota.resetAt.toISOString(),
  });

  if (anon.shouldSetCookie) {
    response.cookies.set({
      name: ANON_USAGE_COOKIE_NAME,
      value: anon.anonId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}
