import type { Metadata } from "next";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your All In One account for faster daily utility workflows.",
};

export default function SignUpPage() {
  return (
    <div className="grid-lines min-h-screen">
      <MainNav />
      <main className="site-shell mt-10 pb-12">
        <section className="mx-auto w-full max-w-lg glass-panel rounded-3xl p-7 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] muted">Get started</p>
          <h1 className="mt-3 text-3xl font-extrabold">Create account</h1>
          <p className="muted mt-3 text-sm leading-6">
            Register once and access all conversion and download tools in one dashboard.
          </p>

          <form className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Name</span>
              <input
                type="text"
                placeholder="Your name"
                className="surface w-full rounded-xl border border-white/30 px-4 py-3 outline-none focus:border-[var(--accent)]"
              />
            </label>
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
                placeholder="Create password"
                className="surface w-full rounded-xl border border-white/30 px-4 py-3 outline-none focus:border-[var(--accent)]"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
            >
              Sign up
            </button>
          </form>

          <p className="muted mt-4 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[var(--accent)]">
              Log in
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
