import Stripe from "stripe";

let cachedStripe: Stripe | null = null;

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }
  return secretKey.trim();
}

export function getStripe() {
  if (cachedStripe) {
    return cachedStripe;
  }

  cachedStripe = new Stripe(getStripeSecretKey());
  return cachedStripe;
}
