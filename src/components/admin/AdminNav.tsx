"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Ραντεβού" },
  { href: "/admin/services", label: "Υπηρεσίες" },
  { href: "/admin/hours", label: "Ωράριο" },
  { href: "/admin/closures", label: "Αργίες & κλεισίματα" },
  { href: "/admin/promotions", label: "Προσφορές" },
  { href: "/admin/instagram", label: "Instagram" },
  { href: "/admin/waitlist", label: "Αναμονή" },
  { href: "/admin/settings", label: "Ρυθμίσεις" },
];

export function AdminNav({ email }: { email?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="border-b border-bronze/15 bg-ink-900">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <span className="mr-3 font-display font-semibold text-bronze">27 · Admin</span>
          {links.map((l) => {
            const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  active ? "bg-bronze text-ink-950" : "text-bone-muted hover:text-bone"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {email && <span className="hidden text-xs text-bone-dim sm:inline">{email}</span>}
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-bronze/25 px-4 py-2 text-sm text-bone-muted hover:text-bone"
          >
            Αποσύνδεση
          </button>
        </div>
      </div>
    </div>
  );
}
