"use client";

import { useState } from "react";

export function CancelBooking({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "confirm" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function doCancel() {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch(`/api/bookings/${token}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "Δεν ήταν δυνατή η ακύρωση.");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setMessage("Σφάλμα σύνδεσης. Δοκιμάστε ξανά.");
    }
  }

  if (state === "done") {
    return (
      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        Η κράτηση ακυρώθηκε. Η ώρα απελευθερώθηκε. Ευχαριστούμε που μας ενημερώσατε.
      </p>
    );
  }

  const showConfirm = state === "confirm" || state === "loading";

  return (
    <div>
      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setState("confirm")}
          className="rounded-full border border-red-500/40 px-6 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/10"
        >
          Ακύρωση ραντεβού
        </button>
      ) : (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-bone">Είστε σίγουρος ότι θέλετε να ακυρώσετε;</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={doCancel}
              disabled={state === "loading"}
              className="rounded-full bg-red-500/90 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {state === "loading" ? "Ακύρωση…" : "Ναι, ακύρωση"}
            </button>
            <button
              type="button"
              onClick={() => setState("idle")}
              className="rounded-full border border-bronze/25 px-5 py-2.5 text-sm text-bone-muted"
            >
              Όχι
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {message}
        </p>
      )}
    </div>
  );
}
