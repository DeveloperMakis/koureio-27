import { business, GOOGLE_RATING } from "@/config/business";

/**
 * Αξιολογήσεις: παραπέμπουμε στις ΠΡΑΓΜΑΤΙΚΕΣ κριτικές Google, με σαφή πηγή.
 * Δεν κατασκευάζουμε κριτικές/βαθμολογίες. Η βαθμολογία προβάλλεται ως σύνδεσμος
 * προς Google και ΔΕΝ χρησιμοποιείται σε schema aggregateRating.
 */
export function ReviewsSection() {
  const reviewsUrl = business.maps.placeUrl;

  return (
    <div className="rounded-2xl border border-bronze/15 bg-ink-900 p-8 text-center">
      <p className="text-sm uppercase tracking-widest2 text-bronze">Αξιολογήσεις</p>

      {GOOGLE_RATING && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="font-display text-4xl font-semibold text-bone">
            {GOOGLE_RATING.value.toLocaleString("el-GR", { minimumFractionDigits: 1 })}
          </span>
          <span aria-hidden className="text-2xl text-bronze">
            ★★★★★
          </span>
        </div>
      )}
      <p className="mt-2 text-sm text-bone-muted">
        {GOOGLE_RATING
          ? `Βαθμολογία ${GOOGLE_RATING.value.toLocaleString("el-GR", {
              minimumFractionDigits: 1,
            })} από ${GOOGLE_RATING.count} αξιολογήσεις στο Google.`
          : "Δείτε τις αξιολογήσεις μας στο Google."}
      </p>

      <a
        href={reviewsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex rounded-full border border-bronze/40 px-6 py-2.5 text-sm font-semibold text-bronze-light hover:bg-bronze hover:text-ink-950"
      >
        Δες τις αξιολογήσεις μας στο Google
      </a>
    </div>
  );
}
