import { prisma } from "@/lib/db";
import { createOfferAction } from "@/app/admin/actions";
import { formatAthensDateLong, formatAthensTime, formatAthensDateShort, todayAthens } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage() {
  const [entries, barbers, services, offers] = await Promise.all([
    prisma.waitlist.findMany({ where: { status: { in: ["OPEN", "OFFERED"] } }, orderBy: { createdAt: "asc" } }),
    prisma.barber.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.service.findMany({ select: { id: true, name: true } }),
    prisma.waitlistOffer.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } }),
  ]);
  const svcName = (id: string) => services.find((s) => s.id === id)?.name ?? id;
  const barberName = (id: string | null) => (id ? barbers.find((b) => b.id === id)?.name ?? id : "Χωρίς προτίμηση");
  const activeOffer = (waitlistId: string) => offers.find((o) => o.waitlistId === waitlistId && o.expiresAt > new Date());

  const input = "w-full rounded-lg border border-bronze/20 bg-ink-950 px-3 py-2 text-sm text-bone outline-none focus:border-bronze";

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-bone">Λίστα αναμονής</h1>
      <p className="mt-1 text-sm text-bone-muted">
        Όταν ελευθερωθεί ώρα, πρόσφερε τη θέση σε έναν πελάτη. Η προσφορά κρατά τη θέση (hold) μέχρι να λήξει ή να γίνει αποδεκτή.
      </p>

      <div className="mt-6 space-y-4">
        {entries.length === 0 && (
          <p className="rounded-2xl border border-bronze/15 bg-ink-900 p-6 text-center text-bone-muted">Κανένα αίτημα αναμονής.</p>
        )}

        {entries.map((e) => {
          const offer = activeOffer(e.id);
          return (
            <div key={e.id} className="rounded-2xl border border-bronze/15 bg-ink-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-bone">{svcName(e.serviceId)}</p>
                  <p className="text-sm text-bone-muted">
                    {e.customerName} · {e.customerPhone}
                    {e.customerId ? " · (λογαριασμός app)" : ""}
                  </p>
                  <p className="mt-1 text-xs text-bone-dim">
                    Προτίμηση: {barberName(e.barberId)} · {formatAthensDateShort(e.dateFrom)}–{formatAthensDateShort(e.dateTo)}
                    {e.timeFrom && e.timeTo ? ` · ${e.timeFrom}–${e.timeTo}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-ink-800 px-3 py-1 text-xs font-semibold text-bone-muted">{e.status}</span>
              </div>

              {offer ? (
                <div className="mt-4 rounded-xl border border-bronze/20 bg-ink-950 p-4 text-sm">
                  <p className="text-bronze-light">Ενεργή προσφορά</p>
                  <p className="text-bone">
                    {formatAthensDateLong(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens" }).format(offer.startAt))} στις {formatAthensTime(offer.startAt)}
                  </p>
                  <p className="text-bone-dim text-xs">Λήγει: {formatAthensTime(offer.expiresAt)} ({barberName(offer.barberId)})</p>
                </div>
              ) : (
                <form action={createOfferAction} className="mt-4 grid gap-3 sm:grid-cols-4">
                  <input type="hidden" name="waitlistId" value={e.id} />
                  <label className="text-sm">
                    <span className="mb-1 block text-bone-muted">Κουρέας</span>
                    <select name="barberId" className={input} defaultValue={e.barberId ?? barbers[0]?.id}>
                      {barbers.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-bone-muted">Ημέρα</span>
                    <input type="date" name="date" className={input} defaultValue={e.dateFrom >= todayAthens() ? e.dateFrom : todayAthens()} required />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-bone-muted">Ώρα</span>
                    <input type="time" name="time" className={input} defaultValue={e.timeFrom ?? ""} required />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-bone-muted">Λήξη (λεπτά)</span>
                    <input type="number" name="ttlMinutes" className={input} defaultValue={60} min={10} max={1440} />
                  </label>
                  <div className="sm:col-span-4">
                    <button type="submit" className="rounded-full bg-bronze px-5 py-2 text-sm font-semibold text-ink-950 hover:bg-bronze-light">
                      Πρόσφερε τη θέση
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
