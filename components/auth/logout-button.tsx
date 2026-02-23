"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton({ mobile = false }: { mobile?: boolean }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    if (isLoading) return;
    setIsLoading(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className={
        mobile
          ? "muted transition-colors hover:text-[var(--accent)] disabled:opacity-60"
          : "btn-secondary glass-panel border px-3 py-2 text-xs font-semibold disabled:opacity-60"
      }
    >
      {isLoading ? "Logging out..." : "Log out"}
    </button>
  );
}
