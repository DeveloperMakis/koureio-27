"use client";

import { useState } from "react";
import Link from "next/link";

export function OfferActions({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "accepted" | "declined" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; manageUrl: string; icsUrl: string } | null>(null);

  async function accept() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch(`/api/offers/${token}/accept`, { method: "POST" });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setState("error");
        setError(d.error ?? "Δεν ήταν δυνατή η αποδοχή.");
        return;
      }
      setResult({ code: d.code, manageUrl: d.manageUrl, icsUrl: d.icsUrl });
      setState("accepted");
    } catch {
      setState("error");
      setError("Σφάλμα σύνδεσης.");
    }
  }

  async function decline() {
    setState("loading");
    await fetch(`/api/offers/${token}/decline`, { method: "POST" }).catch(() => {});
    setState("declined");
  }

  if (state === "accepted" && result) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="font-display text-xl font-semibold text-bone">Η θέση είναι δική σου!</p>
        <p className="mt-2 text-sm text-bone-muted">Κωδικός: {result.code}</p>
        <div className="mt-4 flex flex-col items-center gap-3">
          <a href={result.icsUrl} className="w-full max-w-xs rounded-full bg-bronze px-6 py-3 text-sm font-semibold text-ink-950 hover:bg-bronze-light">
            Προσθήκη στο ημερολόγιο (.ics)
          </a>
          <Link href={result.manageUrl} className="w-full max-w-xs rounded-full border border-bronze/40 px-6 py-3 text-sm font-semibold text-bronze-light hover:bg-bronze hover:text-ink-950">
            Διαχείριση / ακύρωση
          </Link>
        </div>
      </div>
    );
  }

  if (state === "declined") {
    return <p className="rounded-lg border border-bronze/15 bg-ink-900 px-4 py-3 text-sm text-bone-muted">Απορρίφθηκε η προσφορά. Ευχαριστούμε για την ενημέρωση.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={accept}
        disabled={state === "loading"}
        className="rounded-full bg-bronze px-7 py-3 text-base font-semibold text-ink-950 hover:bg-bronze-light disabled:opacity-50"
      >
        {state === "loading" ? "Παρακαλώ περίμενε…" : "Αποδοχή θέσης"}
      </button>
      <button
        type="button"
        onClick={decline}
        disabled={state === "loading"}
        className="rounded-full border border-bronze/25 px-7 py-3 text-base font-medium text-bone-muted hover:text-bone disabled:opacity-50"
      >
        Όχι, ευχαριστώ
      </button>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
