import Link from "next/link";
import Image from "next/image";

/**
 * Το πραγματικό λογότυπο της επιχείρησης (public/logo.png) δίπλα στην επωνυμία.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="ΤΟ ΚΟΥΡΕΙΟΝ 27 — Αρχική"
      className="group inline-flex items-center gap-3"
    >
      <Image
        src="/logo.png"
        alt="ΤΟ ΚΟΥΡΕΙΟΝ 27 — λογότυπο"
        width={44}
        height={44}
        priority
        className="h-11 w-11 shrink-0 object-contain"
      />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-base font-semibold tracking-wide text-bone">
            ΤΟ ΚΟΥΡΕΙΟΝ 27
          </span>
          <span className="text-[0.62rem] uppercase tracking-widest2 text-bronze">
            Barber Shop · Κορυδαλλός
          </span>
        </span>
      )}
    </Link>
  );
}
