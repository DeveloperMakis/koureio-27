import Link from "next/link";
import { prisma } from "@/lib/db";
import { setBookingStatusAction } from "@/app/admin/actions";
import { ManualBookingForm } from "@/components/admin/ManualBookingForm";
import {
  todayAthens,
  addDays,
  athensWallToUtc,
  athensParts,
  formatAthensTime,
  formatAthensDateLong,
} from "@/lib/datetime";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: "Επιβεβαιωμένο", cls: "bg-emerald-500/15 text-emerald-300" },
  CANCELLED: { label: "Ακυρωμένο", cls: "bg-red-500/15 text-red-300" },
  COMPLETED: { label: "Ολοκληρωμένο", cls: "bg-bronze/20 text-bronze-light" },
  NO_SHOW: { label: "Μη προσέλευση", cls: "bg-ink-800 text-bone-muted" },
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { date?: string; view?: string };
}) {
  const view = searchParams.view === "week" ? "week" : "day";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") ? searchParams.date! : todayAthens();

  const endDate = view === "week" ? addDays(date, 6) : date;
  const rangeStart = athensWallToUtc(date, "00:00");
  const rangeEnd = athensWallToUtc(addDays(endDate, 1), "00:00");

  const [bookings, services, barbers] = await Promise.all([
    prisma.booking.findMany({
      where: { startAt: { gte: rangeStart, lt: rangeEnd } },
      include: { barber: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.service.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.barber.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
  ]);

  // Ομαδοποίηση ανά ημέρα (ώρα Αθήνας).
  const groups = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const key = athensParts(b.startAt).dateStr;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }

  const prev = addDays(date, view === "week" ? -7 : -1);
  const next = addDays(date, view === "week" ? 7 : 1);
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-bone">Ημερολόγιο</h1>
          <p className="mt-1 text-sm text-bone-muted">
            {view === "week"
              ? `${formatAthensDateLong(date)} — ${formatAthensDateLong(endDate)}`
              : formatAthensDateLong(date)}{" "}
            · {confirmedCount} ενεργά
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NavLink href={`/admin?view=${view}&date=${prev}`} label="←" />
          <NavLink href={`/admin?view=${view}&date=${todayAthens()}`} label="Σήμερα" />
          <NavLink href={`/admin?view=${view}&date=${next}`} label="→" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <ViewToggle active={view === "day"} href={`/admin?view=day&date=${date}`} label="Ημέρα" />
        <ViewToggle active={view === "week"} href={`/admin?view=week&date=${date}`} label="Εβδομάδα" />
      </div>

      <div className="mt-6">
        <ManualBookingForm services={services} barbers={barbers} defaultDate={date} />
      </div>

      <div className="mt-8 space-y-8">
        {bookings.length === 0 && (
          <p className="rounded-2xl border border-bronze/15 bg-ink-900 p-8 text-center text-bone-muted">
            Δεν υπάρχουν ραντεβού για αυτό το διάστημα.
          </p>
        )}

        {Array.from(groups.entries()).map(([day, items]) => (
          <section key={day}>
            {view === "week" && (
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-bronze">
                {formatAthensDateLong(day)}
              </h2>
            )}
            <ul className="space-y-3">
              {items.map((b) => {
                const st = STATUS[b.status] ?? { label: b.status, cls: "bg-ink-800 text-bone" };
                return (
                  <li
                    key={b.id}
                    className="flex flex-col gap-3 rounded-2xl border border-bronze/15 bg-ink-900 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-center">
                        <div className="font-display text-lg font-semibold text-bone">
                          {formatAthensTime(b.startAt)}
                        </div>
                        <div className="text-xs text-bone-dim">{formatAthensTime(b.endAt)}</div>
                      </div>
                      <div>
                        <p className="font-medium text-bone">{b.serviceName}</p>
                        <p className="text-sm text-bone-muted">
                          {b.customerName}
                          {b.customerPhone ? (
                            <>
                              {" · "}
                              <a href={`tel:${b.customerPhone}`} className="hover:text-bone">
                                {b.customerPhone}
                              </a>
                            </>
                          ) : null}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-bone-dim">
                          <span className={`rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                          <span>{b.barber.name}</span>
                          <span className="uppercase">{b.source === "admin" ? "κατάστημα" : "online"}</span>
                          <span>#{b.code}</span>
                        </p>
                      </div>
                    </div>

                    {b.status === "CONFIRMED" && (
                      <div className="flex flex-wrap gap-2">
                        <StatusForm id={b.id} status="COMPLETED" label="Ολοκληρώθηκε" tone="bronze" />
                        <StatusForm id={b.id} status="NO_SHOW" label="Μη προσέλευση" tone="muted" />
                        <StatusForm id={b.id} status="CANCELLED" label="Ακύρωση" tone="danger" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-bronze/25 px-4 py-2 text-sm text-bone-muted hover:text-bone"
    >
      {label}
    </Link>
  );
}

function ViewToggle({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm ${
        active ? "bg-bronze text-ink-950" : "border border-bronze/25 text-bone-muted hover:text-bone"
      }`}
    >
      {label}
    </Link>
  );
}

function StatusForm({
  id,
  status,
  label,
  tone,
}: {
  id: string;
  status: string;
  label: string;
  tone: "bronze" | "muted" | "danger";
}) {
  const cls =
    tone === "bronze"
      ? "border-bronze/40 text-bronze-light hover:bg-bronze hover:text-ink-950"
      : tone === "danger"
        ? "border-red-500/40 text-red-200 hover:bg-red-500/10"
        : "border-bronze/20 text-bone-muted hover:text-bone";
  return (
    <form action={setBookingStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`rounded-full border px-3 py-1.5 text-xs font-medium ${cls}`}>
        {label}
      </button>
    </form>
  );
}
