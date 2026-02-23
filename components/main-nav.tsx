import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUserFromSession } from "@/lib/server-auth";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "Tools" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Log In" },
  { href: "/signup", label: "Sign Up" },
];

const privateLinks = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "Tools" },
  { href: "/pricing", label: "Pricing" },
];

export async function MainNav() {
  const sessionUser = await getCurrentUserFromSession();
  const links = sessionUser ? privateLinks : publicLinks;

  return (
    <header className="pt-6">
      <div className="site-shell">
        <div className="glass-panel flex items-center justify-between gap-4 rounded-2xl px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/allinone-logo.png"
              alt="All In One logo"
              width={44}
              height={44}
              className="rounded-xl border border-white/20 object-cover object-center"
              priority
            />
            <span className="text-sm font-bold tracking-[0.16em]">ALL IN ONE</span>
          </Link>

          <nav className="hidden items-center gap-5 text-sm md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="muted transition-colors hover:text-[var(--accent)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {sessionUser && <LogoutButton />}
            <Link href="/tools" className="btn-primary px-3 py-2 text-xs font-semibold">
              Open Hub
            </Link>
          </div>
        </div>

        <nav className="mt-3 flex items-center justify-center gap-4 text-xs md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="muted transition-colors hover:text-[var(--accent)]"
            >
              {link.label}
            </Link>
          ))}
          {sessionUser && <LogoutButton mobile />}
        </nav>
      </div>
    </header>
  );
}
