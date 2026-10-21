import { prisma } from "@/lib/db";
import { createPromotionAction, sendPromotionAction, deletePromotionAction } from "@/app/admin/actions";
import { formatAthensDateLong, formatAthensTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  const [promotions, audience] = await Promise.all([
    prisma.promotion.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.customer.count({ where: { notifyPush: true } }),
  ]);

  const inputCls =
    "w-full rounded-lg border border-bronze/20 bg-ink-950 px-3 py-2 text-sm text-bone outline-none focus:border-bronze";

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-bone">Προσφορές & ανακοινώσεις</h1>
      <p className="mt-1 text-sm text-bone-muted">
        Στείλε προσφορές/ανακοινώσεις στους πελάτες της εφαρμογής. Η ειδοποίηση εμφανίζεται στα
        «Εισερχόμενα» της εφαρμογής και αποστέλλεται push σε όσους το έχουν ενεργό.
      </p>
      <p className="mt-2 inline-block rounded-full bg-bronze/10 px-3 py-1 text-xs text-bronze-light">
        Ενεργοί παραλήπτες push: {audience}
      </p>

      {/* Νέα προσφορά */}
      <form action={createPromotionAction} className="mt-6 rounded-2xl border border-bronze/15 bg-ink-900 p-5">
        <h2 className="mb-4 font-semibold text-bone">Νέα προσφορά</h2>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-bone-muted">Τίτλος</span>
            <input name="title" className={inputCls} required maxLength={120} placeholder="π.χ. -20% στο κούρεμα αυτή την εβδομάδα" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-bone-muted">Κείμενο</span>
            <textarea name="body" rows={3} className={inputCls} required maxLength={500} placeholder="Λεπτομέρειες της προσφοράς…" />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-full bg-bronze px-5 py-2 text-sm font-semibold text-ink-950 hover:bg-bronze-light"
        >
          Αποθήκευση
        </button>
      </form>

      {/* Λίστα */}
      <div className="mt-8 space-y-3">
        {promotions.length === 0 && (
          <p className="rounded-2xl border border-bronze/15 bg-ink-900 p-6 text-center text-bone-muted">
            Δεν υπάρχουν προσφορές ακόμη.
          </p>
        )}
        {promotions.map((p) => {
          const sent = p.sentAt
            ? `Στάλθηκε σε ${p.recipients} ${formatAthensDateLong(athensDateStr(p.sentAt))} στις ${formatAthensTime(p.sentAt)}`
            : null;
          return (
            <div key={p.id} className="rounded-2xl border border-bronze/15 bg-ink-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-bone">{p.title}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-bone-muted">{p.body}</p>
                  {sent ? (
                    <p className="mt-2 text-xs text-emerald-300">{sent}</p>
                  ) : (
                    <p className="mt-2 text-xs text-bone-dim">Δεν έχει σταλεί ακόμη.</p>
                  )}
                </div>
                <form action={deletePromotionAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/10"
                  >
                    Διαγραφή
                  </button>
                </form>
              </div>
              {!p.sentAt && (
                <form action={sendPromotionAction} className="mt-4">
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="rounded-full bg-bronze px-5 py-2 text-sm font-semibold text-ink-950 hover:bg-bronze-light"
                  >
                    Αποστολή σε {audience} πελάτες
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Μικρό helper: "YYYY-MM-DD" (ώρα Αθήνας) από Date — μέσω formatAthensDateLong χρειαζόμαστε dateStr.
function athensDateStr(d: Date): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return dtf.format(d); // en-CA → "YYYY-MM-DD"
}
