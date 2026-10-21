"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Opt {
  id: string;
  name: string;
}

interface CustomerMatch {
  name: string;
  phone: string;
}

export function ManualBookingForm({
  services,
  barbers,
  defaultDate,
}: {
  services: Opt[];
  barbers: Opt[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Αναζήτηση υπάρχοντος πελάτη καθώς γράφει ο ιδιοκτήτης (admin only).
  const [matches, setMatches] = useState<CustomerMatch[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const pickedRef = useRef(false); // μόλις επιλέχθηκε πελάτης → μη ξανακάνεις αναζήτηση

  useEffect(() => {
    if (pickedRef.current) {
      pickedRef.current = false;
      return;
    }
    const q = name.trim();
    if (q.length < 2) {
      setMatches([]);
      setShowMatches(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/customers?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const d = await r.json();
        setMatches(d.results ?? []);
        setShowMatches((d.results ?? []).length > 0);
      } catch {
        /* αγνόησε — απλώς δεν δείχνουμε προτάσεις */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [name]);

  function pickCustomer(c: CustomerMatch) {
    pickedRef.current = true;
    setName(c.name);
    setPhone(c.phone);
    setShowMatches(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, barberId, date, time, customerName: name, customerPhone: phone, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg({ ok: false, text: data.error ?? "Αποτυχία." });
        return;
      }
      setMsg({ ok: true, text: `Καταχωρήθηκε (${data.code}).` });
      setName("");
      setPhone("");
      setTime("");
      setNotes("");
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Σφάλμα σύνδεσης." });
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-bronze px-5 py-2.5 text-sm font-semibold text-ink-950 hover:bg-bronze-light"
      >
        + Νέο ραντεβού (τηλεφωνικό/επιτόπιο)
      </button>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-bronze/20 bg-ink-950 px-3 py-2.5 text-sm text-bone outline-none focus:border-bronze";

  return (
    <form onSubmit={submit} className="rounded-2xl border border-bronze/15 bg-ink-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-bone">Νέο ραντεβού</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-bone-dim hover:text-bone">
          Κλείσιμο
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-bone-muted">Υπηρεσία</span>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls} required>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-bone-muted">Κουρέας</span>
          <select value={barberId} onChange={(e) => setBarberId(e.target.value)} className={inputCls} required>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-bone-muted">Ημερομηνία</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-bone-muted">Ώρα</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} required />
        </label>
        <label className="relative text-sm">
          <span className="mb-1 block text-bone-muted">Όνομα πελάτη</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => matches.length > 0 && setShowMatches(true)}
            autoComplete="off"
            className={inputCls}
            required
          />
          {showMatches && matches.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-bronze/30 bg-ink-950 shadow-lg">
              <p className="border-b border-bronze/10 px-3 py-1.5 text-[0.7rem] uppercase tracking-wide text-bone-dim">
                Υπάρχοντες πελάτες
              </p>
              {matches.map((c, i) => (
                <button
                  key={`${c.name}-${c.phone}-${i}`}
                  type="button"
                  onClick={() => pickCustomer(c)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-bronze/10"
                >
                  <span className="text-bone">{c.name}</span>
                  <span className="text-xs text-bone-dim">{c.phone || "—"}</span>
                </button>
              ))}
            </div>
          )}
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-bone-muted">Τηλέφωνο (προαιρετικό)</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} inputMode="tel" />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-bone-muted">Σημείωση (προαιρετικό)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </label>
      </div>

      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-full bg-bronze px-6 py-2.5 text-sm font-semibold text-ink-950 disabled:opacity-50"
      >
        {loading ? "Καταχώρηση…" : "Καταχώρηση"}
      </button>
    </form>
  );
}
