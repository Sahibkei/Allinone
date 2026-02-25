import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { applyEntitlementToUserById, getUserById, mapStripePriceIdToPlan } from "@/lib/entitlements";
import { getCurrentUserFromSession } from "@/lib/server-auth";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function toStripeId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function getFirstPriceIdForSession(stripe: Stripe, sessionId: string) {
  const items = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 });
  return items.data[0]?.price?.id ?? null;
}

export async function POST() {
  try {
    const sessionUser = await getCurrentUserFromSession();
    if (!sessionUser?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const dbUser = await getUserById(sessionUser.id);
    if (!dbUser?._id) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const stripeCustomerId = dbUser.stripeCustomerId?.trim();
    if (!stripeCustomerId) {
      return NextResponse.json({ updated: false, reason: "No Stripe customer id on user." });
    }

    const stripe = getStripe();
    const sessions = await stripe.checkout.sessions.list({
      customer: stripeCustomerId,
      limit: 10,
    });

    for (const checkoutSession of sessions.data) {
      if (checkoutSession.status !== "complete") {
        continue;
      }

      const isPaidOrSubscription =
        checkoutSession.mode === "subscription" || checkoutSession.payment_status === "paid";
      if (!isPaidOrSubscription) {
        continue;
      }

      const priceId = await getFirstPriceIdForSession(stripe, checkoutSession.id);
      const purchasedAt = new Date((checkoutSession.created ?? Math.floor(Date.now() / 1000)) * 1000);
      const mappedPlan = mapStripePriceIdToPlan(priceId, purchasedAt);
      if (!mappedPlan) {
        continue;
      }

      await applyEntitlementToUserById(dbUser._id, {
        ...mappedPlan,
        stripeCustomerId: toStripeId(checkoutSession.customer),
        stripeSubscriptionId: toStripeId(checkoutSession.subscription),
      });

      return NextResponse.json({
        updated: true,
        plan: mappedPlan.plan,
      });
    }

    return NextResponse.json({ updated: false, reason: "No completed paid checkout found yet." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected reconciliation error.";
    console.error("[stripe/reconcile] failed:", message);
    return NextResponse.json({ message }, { status: 500 });
  }
}

