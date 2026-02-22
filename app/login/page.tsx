import type { Metadata } from "next";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your All In One account to access utility workflows.",
};

export default function LoginPage() {
  return (
    <div className="grid-lines min-h-screen">
      <MainNav />
      <main className="site-shell mt-10 pb-12">
        <section className="mx-auto w-full max-w-lg glass-panel rounded-3xl p-7 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] muted">Welcome back</p>
          <h1 className="mt-3 text-3xl font-extrabold">Log in</h1>
          <p className="muted mt-3 text-sm leading-6">
            Sign in to continue using your saved tool presets and conversion history.
          </p>

          <form className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                className="surface w-full rounded-xl border border-white/30 px-4 py-3 outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Password</span>
              <input
                type="password"
                placeholder="Your password"
                className="surface w-full rounded-xl border border-white/30 px-4 py-3 outline-none focus:border-[var(--accent)]"
              />
            </label>
            <button
              type="submit"
              className="btn-primary w-full px-4 py-3 text-sm"
            >
              Log in
            </button>
          </form>

          <p className="muted mt-4 text-sm">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-[var(--accent)]">
              Create an account
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
