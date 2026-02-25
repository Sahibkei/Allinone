import { NextResponse } from "next/server";
import { getUserById } from "@/lib/entitlements";
import { getCurrentUserFromSession } from "@/lib/server-auth";
import { getStripe } from "@/lib/stripe";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const runtime = "nodejs";

export async function POST() {
  const sessionUser = await getCurrentUserFromSession();
  if (!sessionUser?.id) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const user = await getUserById(sessionUser.id);
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ message: "No billing profile found for this account." }, { status: 400 });
  }

  const stripe = getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getAppUrl()}/pricing`,
  });

  return NextResponse.redirect(portalSession.url, 303);
}
