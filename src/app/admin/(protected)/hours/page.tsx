import { prisma } from "@/lib/db";
import { updateHoursAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

// Εμφάνιση Δευτέρα → Κυριακή (dayOfWeek: 0=Κυρ … 6=Σαβ).
const DAYS: { dow: number; label: string }[] = [
  { dow: 1, label: "Δευτέρα" },
  { dow: 2, label: "Τρίτη" },
  { dow: 3, label: "Τετάρτη" },
  { dow: 4, label: "Πέμπτη" },
  { dow: 5, label: "Παρασκευή" },
  { dow: 6, label: "Σάββατο" },
  { dow: 0, label: "Κυριακή" },
];

export default async function AdminHoursPage() {
  const barbers = await prisma.barber.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: { schedules: true },
  });

  const inputCls =
    "rounded-lg border border-bronze/20 bg-ink-950 px-3 py-2 text-sm text-bone outline-none focus:border-bronze";

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-bone">Ωράριο καταστήματος</h1>
      <p className="mt-1 text-sm text-bone-muted">
        Όρισε ώρες λειτουργίας ανά ημέρα. Οι διαθέσιμες ώρες για ραντεβού υπολογίζονται από εδώ.
        Άφησε μια ημέρα <strong>κενή</strong> για να είναι κλειστά. (Ένα διάστημα ανά ημέρα.)
      </p>

      {barbers.length === 0 && (
        <p className="mt-6 rounded-2xl border border-bronze/15 bg-ink-900 p-6 text-center text-bone-muted">
          Δεν υπάρχει ενεργός κουρέας.
        </p>
      )}

      {barbers.map((b) => {
        // Πρώτο διάστημα ανά ημέρα (το UI υποστηρίζει ένα).
        const byDay = new Map<number, { open: string; close: string }>();
        for (const s of b.schedules) {
          if (!byDay.has(s.dayOfWeek)) byDay.set(s.dayOfWeek, { open: s.open, close: s.close });
        }
        return (
          <form key={b.id} action={updateHoursAction} className="mt-6 rounded-2xl border border-bronze/15 bg-ink-900 p-5">
            <input type="hidden" name="barberId" value={b.id} />
            <h2 className="mb-4 font-semibold text-bone">{b.name}</h2>
            <div className="space-y-2">
              {DAYS.map((d) => {
                const v = byDay.get(d.dow);
                return (
                  <div key={d.dow} className="flex flex-wrap items-center gap-3">
                    <span className="w-24 text-sm text-bone-muted">{d.label}</span>
                    <input type="time" name={`open_${d.dow}`} defaultValue={v?.open ?? ""} className={inputCls} />
                    <span className="text-bone-dim">–</span>
                    <input type="time" name={`close_${d.dow}`} defaultValue={v?.close ?? ""} className={inputCls} />
                    {!v && <span className="text-xs text-bone-dim">(κλειστά)</span>}
                  </div>
                );
              })}
            </div>
            <button
              type="submit"
              className="mt-4 rounded-full bg-bronze px-5 py-2 text-sm font-semibold text-ink-950 hover:bg-bronze-light"
            >
              Αποθήκευση ωραρίου
            </button>
          </form>
        );
      })}
    </div>
  );
}
