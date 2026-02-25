"use client";

import Link from "next/link";

type UsagePaywallModalProps = {
  open: boolean;
  reason: string;
  remaining: number | null;
  resetAt: string | null;
  onClose: () => void;
};

export function UsagePaywallModal({
  open,
  reason,
  remaining,
  resetAt,
  onClose,
}: UsagePaywallModalProps) {
  if (!open) {
    return null;
  }

  const resetLabel = resetAt ? new Date(resetAt).toLocaleString() : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 md:p-8">
        <h3 className="text-2xl font-bold">Usage limit reached</h3>
        <p className="muted mt-3 text-sm leading-6">{reason}</p>
        {remaining !== null && (
          <p className="muted mt-2 text-xs">
            Remaining: {remaining}
            {resetLabel ? ` · Resets at: ${resetLabel}` : ""}
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link href="/signup" className="btn-secondary glass-panel border px-4 py-3 text-center text-sm">
            Create free account
          </Link>
          <Link href="/pricing" className="btn-primary px-4 py-3 text-center text-sm">
            Buy Day Pass (€3)
          </Link>
          <Link href="/pricing" className="btn-primary px-4 py-3 text-center text-sm">
            Go Unlimited
          </Link>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 rounded-full border border-white/25 px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
