import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  applyEntitlementByEmailOrCreatePending,
  applyEntitlementToUserById,
  beginStripeEventProcessing,
  expireDayPassByStripeCustomer,
  getUserById,
  mapStripePriceIdToPlan,
  markStripeEventProcessed,
  updateUserEntitlementByStripeRefs,
} from "@/lib/entitlements";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }
  return secret.trim();
}

function toStripeId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const legacy = (invoice as Stripe.Invoice & { subscription?: string | { id: string } | null })
    .subscription;
  if (legacy) {
    return toStripeId(legacy);
  }

  const nested = (invoice as Stripe.Invoice & {
    parent?: { subscription_details?: { subscription?: string | { id: string } | null } };
  }).parent?.subscription_details?.subscription;

  return toStripeId(nested ?? null);
}

async function getCheckoutPriceId(session: Stripe.Checkout.Session) {
  const stripe = getStripe();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
  return lineItems.data[0]?.price?.id ?? null;
}

async function handleCheckoutCompleted(event: Stripe.Event, session: Stripe.Checkout.Session) {
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
  if (!customerEmail) {
    return;
  }

  const priceId = await getCheckoutPriceId(session);
  const purchasedAt = new Date(event.created * 1000);
  const entitlement = mapStripePriceIdToPlan(priceId, purchasedAt);
  if (!entitlement) {
    return;
  }

  const metadataUserId = session.metadata?.appUserId ?? null;
  if (metadataUserId) {
    const user = await getUserById(metadataUserId);
    if (user?._id) {
      // Checkout session is created from logged-in context; enforce that identity first.
      await applyEntitlementToUserById(user._id, {
        ...entitlement,
        stripeCustomerId: toStripeId(session.customer),
        stripeSubscriptionId: toStripeId(session.subscription),
      });
      return;
    }
  }

  await applyEntitlementByEmailOrCreatePending({
    email: customerEmail,
    entitlement: {
      ...entitlement,
      stripeCustomerId: toStripeId(session.customer),
      stripeSubscriptionId: toStripeId(session.subscription),
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  await updateUserEntitlementByStripeRefs({
    stripeCustomerId: toStripeId(invoice.customer),
    stripeSubscriptionId: subscriptionId,
    updates: {
      planStatus: "active",
      stripeSubscriptionId: subscriptionId,
    },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  await updateUserEntitlementByStripeRefs({
    stripeCustomerId: toStripeId(invoice.customer),
    stripeSubscriptionId: subscriptionId,
    updates: {
      planStatus: "past_due",
      stripeSubscriptionId: subscriptionId,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await updateUserEntitlementByStripeRefs({
    stripeCustomerId: toStripeId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    updates: {
      plan: "free",
      planStatus: "canceled",
      planExpiresAt: null,
      stripeSubscriptionId: null,
    },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  await expireDayPassByStripeCustomer(toStripeId(charge.customer));
}

export async function POST(request: Request) {
  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ message: "Missing Stripe signature." }, { status: 400 });
    }

    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, getWebhookSecret());
  } catch (error) {
    console.error("[stripe/webhook] signature verification failed:", error);
    return NextResponse.json({ message: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    const shouldProcess = await beginStripeEventProcessing(event.id);
    if (!shouldProcess) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.info("[stripe/webhook] processing", { id: event.id, type: event.type });

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event, event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        break;
    }

    await markStripeEventProcessed(event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe/webhook] processing failed:", {
      id: event.id,
      type: event.type,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Webhook processing failed." }, { status: 500 });
  }
}
