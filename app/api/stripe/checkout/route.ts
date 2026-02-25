import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserById } from "@/lib/entitlements";
import { getCurrentUserFromSession } from "@/lib/server-auth";
import { getStripe } from "@/lib/stripe";
import { getUsersCollection } from "@/lib/user-store";

const bodySchema = z.object({
  plan: z.enum(["day_pass", "pro_monthly", "pro_yearly"]),
});

export const runtime = "nodejs";

function getRequiredPriceId(plan: "day_pass" | "pro_monthly" | "pro_yearly") {
  const map = {
    day_pass: process.env.STRIPE_PRICE_DAY,
    pro_monthly: process.env.STRIPE_PRICE_MONTHLY,
    pro_yearly: process.env.STRIPE_PRICE_YEARLY,
  };
  const value = map[plan]?.trim();
  if (!value) {
    throw new Error(`Missing Stripe price id for plan: ${plan}`);
  }
  if (!value.startsWith("price_")) {
    throw new Error(`Invalid Stripe price id for plan ${plan}. Expected value starting with 'price_'.`);
  }
  return value;
}

function getRequestOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  try {
    const requestUrl = new URL(request.url);
    if (requestUrl.origin) {
      return requestUrl.origin;
    }
  } catch {
    // fall through to configured fallback
  }
  return configured && configured.length > 0 ? configured : "http://localhost:3000";
}

async function ensureStripeCustomerId(params: { userId: string; name: string; email: string; existing: string | null | undefined }) {
  if (params.existing?.trim()) {
    return params.existing.trim();
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    name: params.name,
    email: params.email,
    metadata: {
      appUserId: params.userId,
    },
  });

  const users = await getUsersCollection();
  await users.updateOne(
    { emailLower: params.email.toLowerCase() },
    {
      $set: {
        stripeCustomerId: customer.id,
        updatedAt: new Date(),
      },
    },
  );

  return customer.id;
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getCurrentUserFromSession();
    if (!sessionUser?.id) {
      return NextResponse.json({ message: "Please log in before starting checkout." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid checkout request." }, { status: 400 });
    }

    const user = await getUserById(sessionUser.id);
    if (!user || !user._id) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const stripeCustomerId = await ensureStripeCustomerId({
      userId: user._id.toString(),
      name: user.name,
      email: user.emailLower,
      existing: user.stripeCustomerId,
    });

    const priceId = getRequiredPriceId(parsed.data.plan);
    const stripe = getStripe();
    const appUrl = getRequestOrigin(request);
    const mode = parsed.data.plan === "day_pass" ? "payment" : "subscription";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode,
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/pricing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=canceled`,
      metadata: {
        appUserId: user._id.toString(),
        appUserEmail: user.emailLower,
        requestedPlan: parsed.data.plan,
      },
      client_reference_id: user._id.toString(),
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ message: "Could not create checkout session." }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected checkout error.";
    console.error("[stripe/checkout] failed:", message);
    return NextResponse.json({ message }, { status: 500 });
  }
}
