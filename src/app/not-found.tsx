import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="font-display text-7xl font-bold text-bronze/40">27</span>
      <h1 className="mt-4 font-display text-2xl font-semibold text-bone">Η σελίδα δεν βρέθηκε</h1>
      <p className="mt-2 text-bone-muted">Η σελίδα που ψάχνετε δεν υπάρχει ή μετακινήθηκε.</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-bronze px-6 py-3 text-sm font-semibold text-ink-950 hover:bg-bronze-light"
      >
        Επιστροφή στην αρχική
      </Link>
    </div>
  );
}
