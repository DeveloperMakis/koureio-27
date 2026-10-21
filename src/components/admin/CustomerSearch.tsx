"use client";

import { useEffect, useRef, useState } from "react";

interface Match {
  name: string;
  phone: string;
  visits: number;
  lastVisit: string | null;
  lastService: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("el-GR", { timeZone: "Europe/Athens", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function CustomerSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/customers?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        const d = await r.json();
        setResults(d.results ?? []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-bronze/25 px-5 py-2.5 text-sm font-semibold text-bone-muted hover:text-bone"
      >
        🔎 Αναζήτηση πελάτη
      </button>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-bronze/20 bg-ink-950 px-3 py-2.5 text-sm text-bone outline-none focus:border-bronze";

  return (
    <div className="w-full rounded-2xl border border-bronze/15 bg-ink-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-bone">Αναζήτηση πελάτη</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-bone-dim hover:text-bone">
          Κλείσιμο
        </button>
      </div>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Όνομα ή τηλέφωνο…"
        className={inputCls}
      />
      <div className="mt-3 space-y-2">
        {loading && <p className="text-sm text-bone-dim">Αναζήτηση…</p>}
        {!loading && q.trim().length >= 2 && results.length === 0 && (
          <p className="text-sm text-bone-dim">Δεν βρέθηκε πελάτης.</p>
        )}
        {results.map((c, i) => (
          <div key={`${c.name}-${c.phone}-${i}`} className="rounded-xl border border-bronze/10 bg-ink-950 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-bone">{c.name}</p>
              {c.phone ? (
                <a href={`tel:${c.phone}`} className="text-sm text-bronze-light hover:text-bronze">
                  {c.phone}
                </a>
              ) : (
                <span className="text-sm text-bone-dim">—</span>
              )}
            </div>
            <p className="mt-1 text-xs text-bone-dim">
              {c.visits} {c.visits === 1 ? "επίσκεψη" : "επισκέψεις"}
              {c.lastVisit ? ` · τελευταία: ${fmtDate(c.lastVisit)}` : ""}
              {c.lastService ? ` · ${c.lastService}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
