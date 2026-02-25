"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type EntitlementPayload = {
  authenticated: boolean;
  plan: "free" | "day_pass" | "pro_monthly" | "pro_yearly";
  planStatus: "active" | "past_due" | "canceled" | "expired";
  planExpiresAt: string | null;
};

export function PricingCards({ plans }: PricingCardsProps) {
  const router = useRouter();
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [errorText, setErrorText] = useState("");
  const [entitlement, setEntitlement] = useState<EntitlementPayload | null>(null);
  const [entitlementLoaded, setEntitlementLoaded] = useState(false);
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const loadEntitlement = useCallback(async () => {
    try {
      const response = await fetch("/api/me/entitlement", { cache: "no-store" });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as EntitlementPayload;
      setEntitlement(payload);
      return payload;
    } catch {
      // Ignore transient fetch errors on pricing view.
      return null;
    } finally {
      setEntitlementLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadEntitlement();
  }, [loadEntitlement]);

  useEffect(() => {
    if (!searchParams || searchParams.get("checkout") !== "success") {
      return;
    }

    let cancelled = false;
    async function reconcileAfterSuccessReturn() {
      try {
        await fetch("/api/stripe/reconcile", { method: "POST" });
      } catch {
        // ignore and rely on webhook path
      }
      if (!cancelled) {
        await loadEntitlement();
      }
    }

    void reconcileAfterSuccessReturn();
    return () => {
      cancelled = true;
    };
  }, [searchParams, loadEntitlement]);

  const hasActivePaidPlan = useMemo(() => {
    if (!entitlement || !entitlement.authenticated) {
      return false;
    }
    const now = Date.now();
    const hasActiveDayPass =
      entitlement.plan === "day_pass" &&
      entitlement.planStatus === "active" &&
      !!entitlement.planExpiresAt &&
      new Date(entitlement.planExpiresAt).getTime() > now;
    const hasActiveSubscription =
      (entitlement.plan === "pro_monthly" || entitlement.plan === "pro_yearly") &&
      entitlement.planStatus === "active";
    return hasActiveDayPass || hasActiveSubscription;
  }, [entitlement]);

  const planLabel = useMemo(() => {
    if (!entitlement || !hasActivePaidPlan) {
      return "";
    }
    if (entitlement.plan === "day_pass") {
      return "Day Pass active";
    }
    if (entitlement.plan === "pro_monthly") {
      return "Unlimited Monthly active";
    }
    if (entitlement.plan === "pro_yearly") {
      return "Unlimited Yearly active";
    }
    return "Plan active";
  }, [entitlement, hasActivePaidPlan]);

  async function startCheckout(plan: Plan) {
    setErrorText("");
    if (hasActivePaidPlan) {
      setErrorText(`Your subscription is already active${planLabel ? ` (${planLabel})` : ""}.`);
      return;
    }
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
      {searchParams?.get("checkout") === "success" && (
        <p className="mt-4 rounded-xl border border-emerald-300/35 bg-emerald-400/12 px-3 py-2 text-sm text-emerald-200">
          Payment completed. Your plan will be activated after Stripe webhook confirmation.
        </p>
      )}
      {searchParams?.get("checkout") === "canceled" && (
        <p className="mt-4 rounded-xl border border-amber-300/35 bg-amber-400/12 px-3 py-2 text-sm text-amber-200">
          Checkout canceled. No payment was charged.
        </p>
      )}

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
              disabled={activePlan === plan.key || hasActivePaidPlan}
              className="btn-primary mt-6 inline-flex w-full items-center justify-center px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activePlan === plan.key
                ? "Redirecting..."
                : hasActivePaidPlan
                  ? "Subscription active"
                  : plan.cta}
            </button>
          </article>
        ))}
      </section>
      {entitlementLoaded && hasActivePaidPlan && (
        <p className="mt-4 rounded-xl border border-emerald-300/35 bg-emerald-400/12 px-3 py-2 text-sm text-emerald-200">
          Your subscription is active{planLabel ? ` (${planLabel})` : ""}.
        </p>
      )}
      {!!errorText && (
        <p className="mt-4 rounded-xl border border-red-300/35 bg-red-400/12 px-3 py-2 text-sm text-red-200">
          {errorText}
        </p>
      )}
    </>
  );
}
