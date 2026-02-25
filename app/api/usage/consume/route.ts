import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntitlementSnapshot, getUserById } from "@/lib/entitlements";
import { getCurrentUserFromSession } from "@/lib/server-auth";
import {
  ANON_USAGE_COOKIE_NAME,
  consumeFreeUserQuota,
  consumeGuestQuota,
  getOrCreateAnonUsageId,
} from "@/lib/usage-limits";

const requestSchema = z.object({
  tool: z.string().trim().min(2).max(80),
});

function withAnonCookieIfNeeded(
  response: NextResponse,
  anon: { anonId: string; shouldSetCookie: boolean },
) {
  if (!anon.shouldSetCookie) {
    return response;
  }

  response.cookies.set({
    name: ANON_USAGE_COOKIE_NAME,
    value: anon.anonId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ allowed: false, reason: "Invalid usage request payload." }, { status: 400 });
  }

  const sessionUser = await getCurrentUserFromSession();
  if (sessionUser?.id) {
    const dbUser = await getUserById(sessionUser.id);
    const snapshot = getEntitlementSnapshot(dbUser);

    if (snapshot.hasUnlimitedAccess) {
      return NextResponse.json({
        allowed: true,
        plan: snapshot.plan,
        planStatus: snapshot.planStatus,
        planExpiresAt: snapshot.planExpiresAt?.toISOString() ?? null,
        remaining: null,
        resetAt: null,
      });
    }

    const quota = await consumeFreeUserQuota({ userId: sessionUser.id });
    if (!quota.allowed) {
      return NextResponse.json({
        allowed: false,
        reason: "Free plan weekly limit reached. Upgrade to continue now.",
        remaining: quota.remaining,
        resetAt: quota.resetAt.toISOString(),
        plan: snapshot.plan,
      });
    }

    return NextResponse.json({
      allowed: true,
      remaining: quota.remaining,
      resetAt: quota.resetAt.toISOString(),
      plan: snapshot.plan,
    });
  }

  const anon = await getOrCreateAnonUsageId();
  const quota = await consumeGuestQuota({ request, anonId: anon.anonId });
  if (!quota.allowed) {
    const response = NextResponse.json({
      allowed: false,
      reason: "Guest daily limit reached. Create a free account or upgrade.",
      remaining: quota.remaining,
      resetAt: quota.resetAt.toISOString(),
      plan: "free",
    });
    return withAnonCookieIfNeeded(response, anon);
  }

  const response = NextResponse.json({
    allowed: true,
    remaining: quota.remaining,
    resetAt: quota.resetAt.toISOString(),
    plan: "free",
  });
  return withAnonCookieIfNeeded(response, anon);
}
