export function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-display text-3xl font-semibold text-bone">{title}</h1>
      <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
        Σημείωση: Το κείμενο είναι πρότυπο και πρέπει να ελεγχθεί/προσαρμοστεί από τον
        ιδιοκτήτη (και νομικό σύμβουλο, αν χρειάζεται) πριν τη δημοσίευση.
      </div>
      <div className="prose-legal mt-8 space-y-5 text-sm leading-relaxed text-bone-muted [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-bone [&_strong]:text-bone">
        {children}
      </div>
    </div>
  );
}
