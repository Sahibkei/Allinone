import type { ReactNode } from "react";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";

type ToolPageShellProps = {
  title: string;
  description: string;
  category: "Image" | "Document";
  children: ReactNode;
};

export function ToolPageShell({ title, description, category, children }: ToolPageShellProps) {
  return (
    <div className="grid-lines min-h-screen">
      <MainNav />
      <main className="site-shell mt-10 pb-12">
        <section className="glass-panel rounded-3xl p-7 md:p-10">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
            <span className="muted">{category}</span>
            <span className="muted">/</span>
            <span className="muted">Phase 1 Tool</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-5xl">{title}</h1>
          <p className="muted mt-4 max-w-3xl leading-7">{description}</p>
          <div className="mt-5">
            <Link href="/tools" className="text-sm font-semibold text-[var(--accent)] hover:opacity-80">
              Back to tools
            </Link>
          </div>
        </section>

        <section className="mt-6">{children}</section>
      </main>
      <SiteFooter />
    </div>
  );
}
