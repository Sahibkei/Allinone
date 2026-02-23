import type { Metadata } from "next";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUserFromSession } from "@/lib/server-auth";
import { tools } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Browse the Phase 1 All In One toolkit: image compression, HEIC conversion, and core PDF utilities.",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I compress images without losing too much quality?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Use the Image Compressor with the Balanced preset, then adjust target size as needed.",
      },
    },
    {
      "@type": "Question",
      name: "Can I convert HEIC photos to JPG or PNG online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Open HEIC to JPG/PNG, upload your files, choose format, and download converted images.",
      },
    },
    {
      "@type": "Question",
      name: "What PDF tools are available in All In One?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can merge and split PDFs, convert images to PDF, and rotate/reorder PDF pages.",
      },
    },
  ],
};

export default async function ToolsPage() {
  const sessionUser = await getCurrentUserFromSession();

  return (
    <div className="grid-lines min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
              <Link
                href={`/tools/${tool.slug}`}
                className="btn-secondary mt-4 inline-flex border border-white/20 px-3 py-2 text-xs muted"
              >
                {tool.status === "Ready" ? "Open tool" : "Open page"}
              </Link>
            </article>
          ))}
        </section>

        {sessionUser ? (
          <section className="glass-panel mt-8 rounded-3xl p-7 md:p-10">
            <h2 className="text-2xl font-bold">Popular Guides And FAQs</h2>
            <p className="muted mt-3 leading-7">
              Welcome back, {sessionUser.name}. Here are quick paths users search most often for
              image compression, HEIC conversion, and PDF editing workflows.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <article className="surface rounded-2xl p-4">
                <h3 className="text-sm font-semibold">Best image size reduction workflow</h3>
                <p className="muted mt-2 text-sm">
                  Start with balanced quality in{" "}
                  <Link href="/tools/image-compressor" className="text-[var(--accent)] underline">
                    Image Compressor
                  </Link>{" "}
                  for social media and web uploads.
                </p>
              </article>
              <article className="surface rounded-2xl p-4">
                <h3 className="text-sm font-semibold">Convert iPhone HEIC to JPG/PNG</h3>
                <p className="muted mt-2 text-sm">
                  Use{" "}
                  <Link href="/tools/heic-to-jpg-png" className="text-[var(--accent)] underline">
                    HEIC to JPG / PNG
                  </Link>{" "}
                  for quick compatibility with apps and websites.
                </p>
              </article>
              <article className="surface rounded-2xl p-4">
                <h3 className="text-sm font-semibold">Merge and reorder PDF files fast</h3>
                <p className="muted mt-2 text-sm">
                  Combine pages in{" "}
                  <Link href="/tools/pdf-merge-split" className="text-[var(--accent)] underline">
                    PDF Merge + Split
                  </Link>{" "}
                  and refine order in{" "}
                  <Link href="/tools/pdf-rotate-reorder" className="text-[var(--accent)] underline">
                    PDF Rotate + Reorder
                  </Link>
                  .
                </p>
              </article>
            </div>
          </section>
        ) : (
          <section className="glass-panel mt-8 rounded-3xl p-7 md:p-10">
            <h2 className="text-2xl font-bold">Need account access?</h2>
            <p className="muted mt-3 leading-7">
              Create an account to keep access stable as we expand image and PDF tools.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary px-5 py-3 text-sm">
                Go to login
              </Link>
              <Link href="/signup" className="btn-secondary glass-panel border px-5 py-3 text-sm">
                Go to signup
              </Link>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
