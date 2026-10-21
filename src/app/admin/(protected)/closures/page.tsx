import { prisma } from "@/lib/db";
import { createClosureAction, deleteClosureAction } from "@/app/admin/actions";
import { athensParts, formatAthensDateLong, formatAthensTime, todayAthens } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function AdminClosuresPage() {
  const now = new Date();
  const [closures, barbers] = await Promise.all([
    prisma.closure.findMany({
      where: { endAt: { gte: now } },
      include: { barber: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.barber.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
  ]);

  const inputCls =
    "w-full rounded-lg border border-bronze/20 bg-ink-950 px-3 py-2 text-sm text-bone outline-none focus:border-bronze";

  function describe(start: Date, end: Date): string {
    const sp = athensParts(start);
    const ep = athensParts(end);
    const allDay = sp.hour === 0 && sp.minute === 0 && ep.hour === 0 && ep.minute === 0;
    if (allDay) return `${formatAthensDateLong(sp.dateStr)} · όλη η ημέρα`;
    return `${formatAthensDateLong(sp.dateStr)} · ${formatAthensTime(start)}–${formatAthensTime(end)}`;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-bone">Κλεισίματα & άδειες</h1>
      <p className="mt-1 text-sm text-bone-muted">
        Κλείστε συγκεκριμένες ώρες ή ολόκληρες ημέρες. Οι ώρες αυτές δεν θα εμφανίζονται ως
        διαθέσιμες για κράτηση.
      </p>

      {/* Νέο κλείσιμο */}
      <form action={createClosureAction} className="mt-6 rounded-2xl border border-bronze/15 bg-ink-900 p-5">
        <h2 className="mb-4 font-semibold text-bone">Νέο κλείσιμο</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-bone-muted">Ημερομηνία</span>
            <input name="date" type="date" defaultValue={todayAthens()} className={inputCls} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-bone-muted">Κουρέας</span>
            <select name="barberId" className={inputCls} defaultValue="">
              <option value="">Όλο το κατάστημα</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-bone-muted">Από (ώρα)</span>
            <input name="startTime" type="time" className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-bone-muted">Έως (ώρα)</span>
            <input name="endTime" type="time" className={inputCls} />
          </label>
          <label className="flex items-center gap-2 text-sm text-bone sm:col-span-2">
            <input name="allDay" type="checkbox" className="h-4 w-4 accent-bronze" />
            Όλη η ημέρα (αγνοεί τις ώρες)
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-bone-muted">Αιτία (προαιρετικό)</span>
            <input name="reason" className={inputCls} placeholder="π.χ. άδεια, αργία" />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-full bg-bronze px-5 py-2 text-sm font-semibold text-ink-950 hover:bg-bronze-light"
        >
          Προσθήκη
        </button>
      </form>

      {/* Λίστα */}
      <div className="mt-8 space-y-3">
        {closures.length === 0 && (
          <p className="rounded-2xl border border-bronze/15 bg-ink-900 p-6 text-center text-bone-muted">
            Δεν υπάρχουν προγραμματισμένα κλεισίματα.
          </p>
        )}
        {closures.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-bronze/15 bg-ink-900 p-4"
          >
            <div>
              <p className="text-sm text-bone">{describe(c.startAt, c.endAt)}</p>
              <p className="text-xs text-bone-dim">
                {c.barber ? c.barber.name : "Όλο το κατάστημα"}
                {c.reason ? ` · ${c.reason}` : ""}
              </p>
            </div>
            <form action={deleteClosureAction}>
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                className="rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/10"
              >
                Διαγραφή
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
