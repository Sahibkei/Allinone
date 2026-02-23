"use client";

import { FormEvent, useState } from "react";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [devVerificationUrl, setDevVerificationUrl] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");
    setDevVerificationUrl("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        devVerificationUrl?: string;
      };

      if (!response.ok) {
        setErrorMessage(payload.message ?? "Could not create account.");
        return;
      }

      setSuccessMessage(payload.message ?? "Account created. Please verify your email.");
      if (payload.devVerificationUrl) {
        setDevVerificationUrl(payload.devVerificationUrl);
      }
      setPassword("");
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Name</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          required
          className="surface w-full rounded-xl border border-white/30 px-4 py-3 outline-none focus:border-[var(--accent)]"
        />
      </label>
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
          placeholder="Create password"
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
        {isSubmitting ? "Creating account..." : "Sign up"}
      </button>

      {!!successMessage && (
        <p className="rounded-xl border border-emerald-300/35 bg-emerald-400/12 px-3 py-2 text-sm text-emerald-200">
          {successMessage}
        </p>
      )}
      {!!devVerificationUrl && (
        <a
          href={devVerificationUrl}
          className="block rounded-xl border border-sky-300/35 bg-sky-400/12 px-3 py-2 text-sm text-sky-100 underline"
        >
          Open verification link (dev)
        </a>
      )}
      {!!errorMessage && (
        <p className="rounded-xl border border-red-300/35 bg-red-400/12 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
