import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";
import { tools } from "@/lib/tools";

export default function Home() {
  const featuredTools = tools;

  return (
    <div className="grid-lines min-h-screen">
      <MainNav />
      <main className="site-shell mt-10 pb-12">
        <section className="glass-panel reveal rounded-3xl p-7 md:p-10">
          <div className="inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold">
            Side Hustle Project
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            One place for <span className="text-gradient">daily online tools</span>
          </h1>
          <p className="muted mt-5 max-w-2xl text-base leading-7 md:text-lg">
            All In One Phase 1 is focused on document and image workflows. Use one clean dashboard
            for compression, HEIC conversion, PDF merge and split, images to PDF, and page
            rotation/reorder.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/tools"
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Explore tools
            </Link>
            <Link
              href="/signup"
              className="glass-panel rounded-full px-5 py-3 text-sm font-semibold"
            >
              Create account
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="surface rounded-2xl p-4">
              <p className="text-2xl font-bold">{tools.length}</p>
              <p className="muted text-sm">Phase 1 tools</p>
            </div>
            <div className="surface rounded-2xl p-4">
              <p className="text-2xl font-bold">2</p>
              <p className="muted text-sm">Modes: light and dark</p>
            </div>
            <div className="surface rounded-2xl p-4">
              <p className="text-2xl font-bold">100%</p>
              <p className="muted text-sm">Responsive layout</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="glass-panel reveal reveal-delay-1 rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Simple user flow</h2>
            <p className="muted mt-3 text-sm leading-6">
              Paste link or upload file, pick options, then download output. Fast actions with low
              friction.
            </p>
          </article>
          <article className="glass-panel reveal reveal-delay-1 rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Clean glass UI</h2>
            <p className="muted mt-3 text-sm leading-6">
              Glassmorphism layout with clear typography and spacing inspired by modern utility
              products.
            </p>
          </article>
          <article className="glass-panel reveal reveal-delay-1 rounded-2xl p-6">
            <h2 className="text-lg font-semibold">SEO-first pages</h2>
            <p className="muted mt-3 text-sm leading-6">
              Structured metadata, descriptive headings, and route-level pages ready for discovery.
            </p>
          </article>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] muted">Tool hub</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">Featured tools</h2>
            </div>
            <Link href="/tools" className="muted text-sm font-semibold hover:text-foreground">
              See all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTools.map((tool) => (
              <article key={tool.slug} className="glass-panel reveal reveal-delay-2 rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] muted">
                  {tool.category}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{tool.name}</h3>
                <p className="muted mt-2 text-sm leading-6">{tool.description}</p>
                <p className="mt-4 text-xs font-semibold text-[var(--accent)]">{tool.status}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-panel mt-8 rounded-3xl p-7 md:p-10">
          <h2 className="text-2xl font-bold">Start with account pages and tool wrappers</h2>
          <p className="muted mt-3 max-w-3xl leading-7">
            This MVP includes landing, login, signup, and tools pages. Next step is wiring each
            card to backend handlers for conversion, download, and media processing.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
            >
              Go to login
            </Link>
            <Link href="/signup" className="glass-panel rounded-full px-5 py-3 text-sm font-semibold">
              Go to sign up
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
