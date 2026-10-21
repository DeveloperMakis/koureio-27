"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { nav } from "@/content/site";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Κλείδωμα scroll όταν ανοίγει το μενού κινητού
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-bronze/15 bg-ink-950/90 backdrop-blur" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo />

        <nav aria-label="Κύριο μενού" className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-bone-muted transition-colors hover:text-bone"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/rantevou"
            className="rounded-full bg-bronze px-5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-bronze-light"
          >
            Κλείσε ραντεβού
          </Link>
        </nav>

        {/* Κουμπί μενού κινητού */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Κλείσιμο μενού" : "Άνοιγμα μενού"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-bronze/25 text-bone md:hidden"
        >
          <span className="relative block h-4 w-5" aria-hidden>
            <span
              className={`absolute left-0 h-0.5 w-5 bg-current transition-all ${
                open ? "top-1.5 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-1.5 h-0.5 w-5 bg-current transition-all ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 h-0.5 w-5 bg-current transition-all ${
                open ? "top-1.5 -rotate-45" : "top-3"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Μενού κινητού */}
      <div
        id="mobile-menu"
        className={`md:hidden ${open ? "block" : "hidden"} border-t border-bronze/15 bg-ink-950/98 backdrop-blur`}
      >
        <nav aria-label="Μενού κινητού" className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base text-bone-muted transition-colors hover:bg-ink-800 hover:text-bone"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/rantevou"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-full bg-bronze px-5 py-3 text-center text-base font-semibold text-ink-950"
          >
            Κλείσε ραντεβού
          </Link>
        </nav>
      </div>
    </header>
  );
}
