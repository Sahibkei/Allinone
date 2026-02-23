"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const verifyBanner = useMemo(() => {
    if (searchParams.get("verified") === "1") {
      return "Email verified successfully. You can log in now.";
    }
    if (searchParams.get("verify") === "invalid") {
      return "Verification link is invalid or expired.";
    }
    return "";
  }, [searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setErrorMessage(payload.message ?? "Could not log in.");
        return;
      }

      router.push("/tools");
      router.refresh();
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      {!!verifyBanner && (
        <p className="rounded-xl border border-emerald-300/35 bg-emerald-400/12 px-3 py-2 text-sm text-emerald-200">
          {verifyBanner}
        </p>
      )}

      <label className="block">
        <span className="mb-2 block text-sm font-medium">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          className="surface w-full rounded-xl border border-white/30 px-4 py-3 outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          required
          minLength={8}
          className="surface w-full rounded-xl border border-white/30 px-4 py-3 outline-none focus:border-[var(--accent)]"
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Log in"}
      </button>

      {!!errorMessage && (
        <p className="rounded-xl border border-red-300/35 bg-red-400/12 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
