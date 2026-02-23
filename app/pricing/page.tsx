import type { Metadata } from "next";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";

const plans = [
  {
    name: "Day Pass",
    price: "€3 Day",
    description: "Best for one-off tasks when you only need the toolkit for a single day.",
    href: "YOUR_STRIPE_DAY_PASS_PAYMENT_LINK",
    cta: "Buy Day Pass",
  },
  {
    name: "Unlimited Monthly",
    price: "€12 Monthly",
    description: "Use all current tools without daily limits, billed monthly.",
    href: "YOUR_STRIPE_MONTHLY_PAYMENT_LINK",
    cta: "Go Unlimited Monthly",
  },
  {
    name: "Unlimited Yearly",
    price: "€84 Yearly",
    description: "Best value for frequent users with lower annual pricing.",
    href: "YOUR_STRIPE_YEARLY_PAYMENT_LINK",
    cta: "Go Unlimited Yearly",
  },
];

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Choose a Day Pass, Unlimited Monthly, or Unlimited Yearly plan for All In One tools. Secure checkout with Stripe Payment Links.",
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

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((plan, index) => (
            <article
              key={plan.name}
              className={`glass-panel reveal rounded-2xl p-6 ${index === 1 ? "md:-translate-y-1" : ""}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] muted">Plan</p>
              <h2 className="mt-2 text-2xl font-bold">{plan.name}</h2>
              <p className="mt-2 text-3xl font-extrabold text-gradient">{plan.price}</p>
              <p className="muted mt-4 text-sm leading-6">{plan.description}</p>

              <a
                href={plan.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-6 inline-flex w-full items-center justify-center px-4 py-3 text-sm"
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </section>

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
