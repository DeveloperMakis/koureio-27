import { prisma } from "@/lib/db";
import { updateServiceAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const services = await prisma.service.findMany({ orderBy: { order: "asc" } });
  const inputCls =
    "w-full rounded-lg border border-bronze/20 bg-ink-950 px-3 py-2 text-sm text-bone outline-none focus:border-bronze";

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-bone">Υπηρεσίες & τιμές</h1>
      <p className="mt-1 text-sm text-bone-muted">
        Ενεργοποιήστε μια υπηρεσία για να εμφανίζεται δημόσια. Χωρίς ενεργές υπηρεσίες, οι online
        κρατήσεις παραμένουν κλειστές.
      </p>

      <div className="mt-6 space-y-4">
        {services.map((s) => (
          <form
            key={s.id}
            action={updateServiceAction}
            className="rounded-2xl border border-bronze/15 bg-ink-900 p-5"
          >
            <input type="hidden" name="id" value={s.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-bone-muted">Όνομα</span>
                <input name="name" defaultValue={s.name} className={inputCls} required />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-bone-muted">Περιγραφή</span>
                <input name="description" defaultValue={s.description} className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-bone-muted">Διάρκεια (λεπτά)</span>
                <input name="durationMin" type="number" min={5} max={480} defaultValue={s.durationMin} className={inputCls} required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-bone-muted">Τιμή (€, κενό = χωρίς τιμή)</span>
                <input
                  name="priceEuros"
                  type="number"
                  step="0.5"
                  min={0}
                  defaultValue={s.priceCents !== null ? (s.priceCents / 100).toString() : ""}
                  className={inputCls}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-bone-muted">Σειρά</span>
                <input name="order" type="number" min={0} defaultValue={s.order} className={inputCls} />
              </label>
              <label className="flex items-center gap-2 self-end text-sm text-bone">
                <input name="active" type="checkbox" defaultChecked={s.active} className="h-4 w-4 accent-bronze" />
                Ενεργή (ορατή δημόσια)
              </label>
            </div>
            <div className="mt-4">
              <button
                type="submit"
                className="rounded-full bg-bronze px-5 py-2 text-sm font-semibold text-ink-950 hover:bg-bronze-light"
              >
                Αποθήκευση
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
