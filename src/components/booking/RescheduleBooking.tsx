"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Αλλαγή ώρας ραντεβού (customer) — ενιαία συναλλαγή στον server:
 * αν η νέα ώρα δεν είναι διαθέσιμη, διατηρείται η αρχική.
 */
export function RescheduleBooking({
  token,
  serviceId,
  minDate,
  maxDate,
}: {
  token: string;
  serviceId: string;
  minDate: string;
  maxDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsState, setSlotsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function loadSlots(d: string) {
    setDate(d);
    setTime(null);
    if (!d) return;
    setSlotsState("loading");
    try {
      const r = await fetch(`/api/availability?serviceId=${serviceId}&date=${d}`);
      const data = await r.json();
      setSlots(Array.isArray(data.anySlots) ? data.anySlots : []);
      setSlotsState("ready");
    } catch {
      setSlotsState("error");
    }
  }

  async function submit() {
    if (!date || !time) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/bookings/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setError(data.error ?? "Δεν ήταν δυνατή η αλλαγή.");
        if (r.status === 409 && date) loadSlots(date);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Σφάλμα σύνδεσης.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        Η ώρα άλλαξε. Η σελίδα ενημερώθηκε με τα νέα στοιχεία.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-bronze/40 px-6 py-3 text-sm font-semibold text-bronze-light hover:bg-bronze hover:text-ink-950"
      >
        Αλλαγή ώρας
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-bronze/20 bg-ink-900 p-5">
      <p className="mb-3 font-semibold text-bone">Νέα ώρα</p>
      <label className="block text-sm">
        <span className="mb-1 block text-bone-muted">Ημερομηνία</span>
        <input
          type="date"
          min={minDate}
          max={maxDate}
          value={date}
          onChange={(e) => loadSlots(e.target.value)}
          className="w-full rounded-lg border border-bronze/20 bg-ink-950 px-3 py-2.5 text-sm text-bone outline-none focus:border-bronze"
        />
      </label>

      <div className="mt-4 min-h-[3rem]">
        {slotsState === "loading" && <p className="animate-pulse text-sm text-bone-muted">Έλεγχος…</p>}
        {slotsState === "ready" && slots.length === 0 && date && (
          <p className="text-sm text-bone-muted">Καμία διαθέσιμη ώρα αυτή την ημέρα.</p>
        )}
        {slotsState === "ready" && slots.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={`rounded-lg border py-2 text-sm font-medium ${
                  time === t ? "border-bronze bg-bronze text-ink-950" : "border-bronze/20 bg-ink-950 text-bone hover:border-bronze/50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!time || submitting}
          className="rounded-full bg-bronze px-5 py-2.5 text-sm font-semibold text-ink-950 disabled:opacity-50"
        >
          {submitting ? "Αλλαγή…" : "Αποθήκευση νέας ώρας"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-bronze/25 px-5 py-2.5 text-sm text-bone-muted">
          Άκυρο
        </button>
      </div>
    </div>
  );
}
