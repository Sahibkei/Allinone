"use client";

import { useState } from "react";

type ConsumeUsagePayload = {
  allowed?: boolean;
  reason?: string;
  remaining?: number | null;
  resetAt?: string | null;
  plan?: string;
};

export type UsageBlockState = {
  open: boolean;
  reason: string;
  remaining: number | null;
  resetAt: string | null;
};

const defaultBlockedState: UsageBlockState = {
  open: false,
  reason: "",
  remaining: null,
  resetAt: null,
};

export function useUsageGuard() {
  const [blockedState, setBlockedState] = useState<UsageBlockState>(defaultBlockedState);

  async function consumeUsage(tool: string) {
    try {
      const response = await fetch("/api/usage/consume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tool }),
      });

      const payload = (await response.json().catch(() => ({}))) as ConsumeUsagePayload;
      if (payload.allowed) {
        return true;
      }

      setBlockedState({
        open: true,
        reason: payload.reason ?? "Usage limit reached. Upgrade or sign up to continue.",
        remaining: payload.remaining ?? null,
        resetAt: payload.resetAt ?? null,
      });
      return false;
    } catch {
      setBlockedState({
        open: true,
        reason: "Could not verify usage right now. Please try again.",
        remaining: null,
        resetAt: null,
      });
      return false;
    }
  }

  function closeBlockedModal() {
    setBlockedState(defaultBlockedState);
  }

  return {
    blockedState,
    consumeUsage,
    closeBlockedModal,
  };
}
