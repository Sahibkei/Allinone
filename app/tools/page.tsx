import type { Metadata } from "next";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";
import { tools } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Browse the Phase 1 All In One toolkit: image compression, HEIC conversion, and core PDF utilities.",
};

export default function ToolsPage() {
  return (
    <div className="grid-lines min-h-screen">
      <MainNav />
      <main className="site-shell mt-10 pb-12">
        <section className="glass-panel rounded-3xl p-7 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] muted">Utility dashboard</p>
          <h1 className="mt-3 text-3xl font-extrabold md:text-5xl">All tools in one place</h1>
          <p className="muted mt-4 max-w-2xl leading-7">
            Pick a Phase 1 tool and start fast. Each card below maps to a dedicated workflow route
            ready for backend processing.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <article key={tool.slug} className="glass-panel rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] muted">{tool.category}</p>
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-semibold">
                  {tool.status}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-semibold">{tool.name}</h2>
              <p className="muted mt-2 text-sm leading-6">{tool.description}</p>
              <button
                type="button"
                className="mt-4 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold muted"
              >
                Coming soon
              </button>
            </article>
          ))}
        </section>

        <section className="glass-panel mt-8 rounded-3xl p-7 md:p-10">
          <h2 className="text-2xl font-bold">Need account access?</h2>
          <p className="muted mt-3 leading-7">
            Login and signup flows are already scaffolded and ready for authentication integration.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
            >
              Go to login
            </Link>
            <Link href="/signup" className="glass-panel rounded-full px-5 py-3 text-sm font-semibold">
              Go to signup
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
