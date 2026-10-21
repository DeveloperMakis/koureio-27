/**
 * Διακριτικό προσωρινό πλαίσιο εικόνας. ΔΕΝ παρουσιάζει ξένους χώρους ή πρόσωπα
 * ως πραγματικά στοιχεία — είναι καθαρά γραφιστικό placeholder μέχρι να
 * προστεθούν οι πραγματικές φωτογραφίες της επιχείρησης.
 */
export function PlaceholderImage({
  label,
  className = "",
  ratio = "aspect-[4/5]",
}: {
  label?: string;
  className?: string;
  ratio?: string;
}) {
  return (
    <div
      className={`ph-frame relative ${ratio} overflow-hidden rounded-xl border border-bronze/15 ${className}`}
      role="img"
      aria-label={label ? `Προσωρινό πλαίσιο φωτογραφίας: ${label}` : "Προσωρινό πλαίσιο φωτογραφίας"}
    >
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-5xl font-semibold text-bronze/30 select-none">27</span>
      </div>
      {label && (
        <span className="absolute bottom-3 left-3 rounded-full bg-ink-950/60 px-3 py-1 text-[0.7rem] uppercase tracking-widest text-bone-dim">
          {label}
        </span>
      )}
    </div>
  );
}
