import { business } from "@/config/business";
import { OpenNow } from "@/components/OpenNow";

/**
 * Εμφανίζεται όταν ΔΕΝ έχουν ρυθμιστεί υπηρεσίες/κουρείς/ωράριο: δεν επιτρέπουμε
 * δημόσιες online κρατήσεις, αλλά δίνουμε τις πραγματικές επιλογές επικοινωνίας.
 */
export function BookingUnavailable() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-bone">Ραντεβού</h1>
      <p className="mt-4 text-bone-muted">
        Οι online κρατήσεις θα είναι σύντομα διαθέσιμες. Μέχρι τότε, κλείστε ραντεβού
        τηλεφωνικά — θα χαρούμε να σας εξυπηρετήσουμε.
      </p>
      <div className="mt-6 flex justify-center">
        <OpenNow />
      </div>
      <div className="mt-8 flex flex-col items-center gap-3">
        {business.phones.map((p) => (
          <a
            key={p.tel}
            href={`tel:${p.tel}`}
            className="w-full max-w-xs rounded-full bg-bronze px-6 py-3 text-base font-semibold text-ink-950 hover:bg-bronze-light"
          >
            Κλήση {p.display}
          </a>
        ))}
        {business.social.instagram && (
          <a
            href={business.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-xs rounded-full border border-bronze/40 px-6 py-3 text-base font-semibold text-bronze-light hover:bg-bronze hover:text-ink-950"
          >
            Instagram
          </a>
        )}
      </div>
      <p className="mt-6 text-sm text-bone-dim">{business.address.full}</p>
    </div>
  );
}
