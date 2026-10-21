"use client";

import { useState } from "react";

/**
 * Φόρμα λίστας αναμονής — ΔΕΝ είναι επιβεβαιωμένο ραντεβού.
 * Εμφανίζεται όταν δεν υπάρχει βολική ώρα.
 */
export function WaitlistForm({
  serviceId,
  barberId,
  defaultDate,
  onDone,
}: {
  serviceId: string;
  barberId?: string | null;
  defaultDate: string;
  onDone?: () => void;
}) {
  const [dateFrom, setDateFrom] = useState(defaultDate);
  const [dateTo, setDateTo] = useState(defaultDate);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          barberId: barberId ?? undefined,
          dateFrom,
          dateTo,
          timeFrom: timeFrom || undefined,
          timeTo: timeTo || undefined,
          customerName: name,
          customerPhone: phone,
          website,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Κάτι πήγε στραβά.");
        setState("idle");
        return;
      }
      setState("done");
      onDone?.();
    } catch {
      setError("Σφάλμα σύνδεσης.");
      setState("idle");
    }
  }

  const input = "w-full rounded-lg border border-bronze/20 bg-ink-950 px-3 py-2.5 text-sm text-bone outline-none focus:border-bronze";

  if (state === "done") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-200">
        Μπήκες στη λίστα αναμονής. <strong>Δεν είναι επιβεβαιωμένο ραντεβού</strong> — θα
        επικοινωνήσουμε αν ανοίξει βολική ώρα.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-bronze/20 bg-ink-900 p-5">
      <p className="mb-1 font-semibold text-bone">Λίστα αναμονής</p>
      <p className="mb-4 text-xs text-bone-dim">
        Δήλωσε πότε σε βολεύει και θα σε ειδοποιήσουμε αν ανοίξει θέση. Δεν δεσμεύει ώρα.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-bone-muted">Από ημέρα</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={input} required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-bone-muted">Έως ημέρα</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={input} required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-bone-muted">Από ώρα (προαιρετικό)</span>
          <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className={input} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-bone-muted">Έως ώρα (προαιρετικό)</span>
          <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className={input} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-bone-muted">Όνομα</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-bone-muted">Κινητό</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} inputMode="tel" required />
        </label>
      </div>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={state === "loading"}
        className="mt-4 rounded-full bg-bronze px-5 py-2.5 text-sm font-semibold text-ink-950 disabled:opacity-50"
      >
        {state === "loading" ? "Καταχώρηση…" : "Μπες στη λίστα αναμονής"}
      </button>
    </form>
  );
}
