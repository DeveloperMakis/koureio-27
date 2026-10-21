import type { Metadata } from "next";
import Link from "next/link";
import { getOfferView } from "@/lib/waitlist-offer";
import { formatPrice, formatDuration } from "@/lib/money";
import { athensParts, formatAthensDateLong, formatAthensTime } from "@/lib/datetime";
import { OfferActions } from "@/components/booking/OfferActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Προσφορά θέσης", robots: { index: false, follow: false } };

export default async function OfferPage({ params }: { params: { token: string } }) {
  const offer = await getOfferView(params.token);

  if (!offer) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-bone">Η προσφορά δεν βρέθηκε</h1>
        <Link href="/" className="mt-6 inline-flex text-sm text-bronze-light underline">Αρχική</Link>
      </div>
    );
  }

  const dateStr = athensParts(new Date(offer.startAtISO)).dateStr;
  const active = offer.status === "PENDING" && !offer.expired;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 md:py-16">
      <p className="text-sm uppercase tracking-widest2 text-bronze">ΤΟ ΚΟΥΡΕΙΟΝ 27</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-bone">Ελευθερώθηκε θέση!</h1>
      <p className="mt-2 text-sm text-bone-muted">
        Σου προσφέρουμε την παρακάτω ώρα από τη λίστα αναμονής. <strong>Δεν είναι ακόμη κράτηση</strong> — ισχύει μέχρι να την αποδεχτείς.
      </p>

      <div className="mt-6 rounded-2xl border border-bronze/15 bg-ink-900 p-6">
        <dl className="space-y-2 text-sm">
          <Row k="Υπηρεσία" v={offer.serviceName} />
          <Row k="Κουρέας" v={offer.barberName} />
          <Row k="Ημερομηνία" v={formatAthensDateLong(dateStr)} />
          <Row k="Ώρα" v={formatAthensTime(new Date(offer.startAtISO))} />
          <Row k="Διάρκεια" v={formatDuration(offer.durationMin)} />
          {formatPrice(offer.priceCents) && <Row k="Τιμή" v={formatPrice(offer.priceCents)!} />}
          <Row k="Πληρωμή" v="Στο κατάστημα" />
        </dl>
      </div>

      <div className="mt-6">
        {active ? (
          <OfferActions token={params.token} />
        ) : offer.status === "ACCEPTED" ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Η προσφορά έχει ήδη γίνει αποδεκτή.
          </p>
        ) : (
          <p className="rounded-lg border border-bronze/15 bg-ink-900 px-4 py-3 text-sm text-bone-muted">
            Η προσφορά δεν είναι πλέον διαθέσιμη (έληξε ή αποσύρθηκε).
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-bone-dim">{k}</dt>
      <dd className="font-medium text-bone">{v}</dd>
    </div>
  );
}
