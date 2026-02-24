"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  key: "day_pass" | "pro_monthly" | "pro_yearly";
  name: string;
  price: string;
  description: string;
  cta: string;
};

type PricingCardsProps = {
  plans: Plan[];
};

export function PricingCards({ plans }: PricingCardsProps) {
  const router = useRouter();
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [errorText, setErrorText] = useState("");

  async function startCheckout(plan: Plan) {
    setErrorText("");
    setActivePlan(plan.key);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.key }),
      });

      const payload = (await response.json().catch(() => ({}))) as { url?: string; message?: string };

      if (response.status === 401) {
        router.push("/login?next=/pricing");
        return;
      }

      if (!response.ok || !payload.url) {
        setErrorText(payload.message ?? "Could not start checkout. Please try again.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      setErrorText("Could not start checkout. Please try again.");
    } finally {
      setActivePlan(null);
    }
  }

  return (
    <>
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

            <button
              type="button"
              onClick={() => startCheckout(plan)}
              disabled={activePlan === plan.key}
              className="btn-primary mt-6 inline-flex w-full items-center justify-center px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activePlan === plan.key ? "Redirecting..." : plan.cta}
            </button>
          </article>
        ))}
      </section>
      {!!errorText && (
        <p className="mt-4 rounded-xl border border-red-300/35 bg-red-400/12 px-3 py-2 text-sm text-red-200">
          {errorText}
        </p>
      )}
    </>
  );
}
