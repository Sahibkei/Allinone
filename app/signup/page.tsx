import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
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

          <SignupForm />

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
