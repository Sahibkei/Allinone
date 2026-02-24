import type { Metadata } from "next";
import { PricingCards } from "@/components/billing/pricing-cards";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";

const plans = [
  {
    key: "day_pass",
    name: "Day Pass",
    price: "EUR 3 Day",
    description: "Best for one-off tasks when you only need the toolkit for a single day.",
    cta: "Buy Day Pass",
  },
  {
    key: "pro_monthly",
    name: "Unlimited Monthly",
    price: "EUR 12 Monthly",
    description: "Use all current tools without daily limits, billed monthly.",
    cta: "Go Unlimited Monthly",
  },
  {
    key: "pro_yearly",
    name: "Unlimited Yearly",
    price: "EUR 84 Yearly",
    description: "Best value for frequent users with lower annual pricing.",
    cta: "Go Unlimited Yearly",
  },
] as const;

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Choose a Day Pass, Unlimited Monthly, or Unlimited Yearly plan for All In One tools. Secure checkout with Stripe.",
};

export default function PricingPage() {
  return (
    <div className="grid-lines min-h-screen">
      <MainNav />
      <main className="site-shell mt-10 pb-12">
        <section className="glass-panel reveal rounded-3xl p-7 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] muted">Pricing</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight md:text-5xl">
            Pick the plan that fits your workflow
          </h1>
          <p className="muted mt-4 max-w-3xl text-base leading-7 md:text-lg">
            Start with a Day Pass or go unlimited. Payments are processed securely by Stripe. We
            do not store card details.
          </p>
        </section>

        <PricingCards plans={[...plans]} />

        <section className="glass-panel mt-8 rounded-3xl p-6 md:p-8">
          <h2 className="text-xl font-bold">Secure checkout</h2>
          <p className="muted mt-3 leading-7">
            Payments are processed securely by Stripe. We do not store card details.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
