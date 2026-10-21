import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { business } from "@/config/business";
import { bookingConfig } from "@/config/booking";
import { formatPrice, formatDuration } from "@/lib/money";
import { athensParts, formatAthensDateLong, formatAthensTime, todayAthens, addDays } from "@/lib/datetime";
import { CancelBooking } from "@/components/booking/CancelBooking";
import { RescheduleBooking } from "@/components/booking/RescheduleBooking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Διαχείριση ραντεβού", robots: { index: false, follow: false } };

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Επιβεβαιωμένο",
  CANCELLED: "Ακυρωμένο",
  COMPLETED: "Ολοκληρωμένο",
  NO_SHOW: "Μη προσέλευση",
};

export default async function ManageBookingPage({ params }: { params: { token: string } }) {
  const booking = await prisma.booking.findUnique({
    where: { cancelToken: params.token },
    include: { barber: true },
  });

  if (!booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-bone">Δεν βρέθηκε η κράτηση</h1>
        <p className="mt-3 text-bone-muted">
          Ο σύνδεσμος δεν είναι έγκυρος ή η κράτηση δεν υπάρχει πλέον.
        </p>
        <Link href="/" className="mt-6 inline-flex text-sm text-bronze-light underline">
          Επιστροφή στην αρχική
        </Link>
      </div>
    );
  }

  const dateStr = athensParts(booking.startAt).dateStr;
  const canCancel =
    booking.status === "CONFIRMED" &&
    (booking.startAt.getTime() - Date.now()) / 3600000 >= bookingConfig.selfCancelHours;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 md:py-16">
      <p className="text-sm uppercase tracking-widest2 text-bronze">ΤΟ ΚΟΥΡΕΙΟΝ 27</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-bone">Το ραντεβού σας</h1>

      <div className="mt-6 rounded-2xl border border-bronze/15 bg-ink-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-bone-dim">Κωδικός</span>
          <span className="font-semibold text-bone">{booking.code}</span>
        </div>
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
            booking.status === "CONFIRMED"
              ? "bg-emerald-500/15 text-emerald-300"
              : booking.status === "CANCELLED"
                ? "bg-red-500/15 text-red-300"
                : "bg-ink-800 text-bone-muted"
          }`}
        >
          {STATUS_LABEL[booking.status] ?? booking.status}
        </span>

        <dl className="mt-5 space-y-2 text-sm">
          <Row label="Υπηρεσία" value={booking.serviceName} />
          <Row label="Ημερομηνία" value={formatAthensDateLong(dateStr)} />
          <Row label="Ώρα" value={formatAthensTime(booking.startAt)} />
          <Row label="Διάρκεια" value={formatDuration(booking.durationMin)} />
          {formatPrice(booking.priceCents) && <Row label="Τιμή" value={formatPrice(booking.priceCents)!} />}
          <Row label="Πληρωμή" value="Στο κατάστημα" />
        </dl>
      </div>

      {booking.status === "CONFIRMED" && (
        <div className="mt-6 space-y-4">
          <a
            href={`/api/bookings/${booking.cancelToken}/ics`}
            className="inline-flex rounded-full bg-bronze px-6 py-3 text-sm font-semibold text-ink-950 hover:bg-bronze-light"
          >
            Προσθήκη στο ημερολόγιο (.ics)
          </a>

          {canCancel ? (
            <div className="space-y-4">
              <RescheduleBooking
                token={booking.cancelToken}
                serviceId={booking.serviceId}
                minDate={todayAthens()}
                maxDate={addDays(todayAthens(), bookingConfig.maxAdvanceDays)}
              />
              <p className="text-sm text-bone-muted">
                Ή ακύρωση έως {bookingConfig.selfCancelHours} ώρες πριν το ραντεβού:
              </p>
              <CancelBooking token={booking.cancelToken} />
            </div>
          ) : (
            <p className="text-sm text-bone-muted">
              Για αλλαγή ή ακύρωση κοντά στην ώρα του ραντεβού, παρακαλώ τηλεφωνήστε μας στο{" "}
              {business.phones.map((p, i) => (
                <span key={p.tel}>
                  {i > 0 && " ή "}
                  <a href={`tel:${p.tel}`} className="underline hover:text-bone">
                    {p.display}
                  </a>
                </span>
              ))}
              .
            </p>
          )}
        </div>
      )}

      <Link href="/" className="mt-8 inline-flex text-sm text-bone-dim underline hover:text-bone">
        ← Αρχική
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-bone-dim">{label}</dt>
      <dd className="font-medium text-bone">{value}</dd>
    </div>
  );
}
