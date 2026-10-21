"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { business } from "@/config/business";

/**
 * Σταθερή κάτω μπάρα για κινητά: Ραντεβού / Κλήση / Οδηγίες.
 * Κρύβεται στις σελίδες κράτησης (εκεί έχει δική της μπάρα με τιμή/επόμενο βήμα).
 */
export function MobileBottomBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/booking") || pathname.startsWith("/rantevou")) return null;

  const phone = business.phones.find((p) => p.primary) ?? business.phones[0];
  const hasPhone = Boolean(phone);
  const hasMaps = Boolean(business.maps.directionsUrl);

  const actions = [
    { key: "book", show: true },
    { key: "call", show: hasPhone },
    { key: "dir", show: hasMaps },
  ].filter((a) => a.show);

  const cols = actions.length;

  return (
    <nav
      aria-label="Γρήγορες ενέργειες"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-bronze/20 bg-ink-950/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        <Link
          href="/rantevou"
          className="flex flex-col items-center gap-1 bg-bronze py-3 text-xs font-semibold text-ink-950"
        >
          <CalendarIcon />
          Ραντεβού
        </Link>
        {hasPhone && (
          <a
            href={`tel:${phone.tel}`}
            className="flex flex-col items-center gap-1 py-3 text-xs text-bone-muted"
          >
            <PhoneIcon />
            Κλήση
          </a>
        )}
        {hasMaps && (
          <a
            href={business.maps.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 py-3 text-xs text-bone-muted"
          >
            <PinIcon />
            Οδηγίες
          </a>
        )}
      </div>
    </nav>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 5c0 8 7 15 15 15l2.5-2.5-4-3-2 1.5c-2-1-4-3-5-5L13 11l-3-4L7.5 4.5 5 5z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
