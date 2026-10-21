/**
 * «Πακέτο» υπηρεσιών ενός ραντεβού (μία ή περισσότερες).
 * Αθροίζει διάρκεια & τιμή, φτιάχνει συνδυασμένο όνομα και διατηρεί στιγμιότυπα
 * ανά υπηρεσία (για αποθήκευση ως BookingService). Κοινό από availability & booking.
 */
import { prisma } from "@/lib/db";

export interface ServiceSnapshot {
  serviceId: string;
  name: string;
  durationMin: number;
  priceCents: number | null;
}

export interface ServiceBundle {
  items: ServiceSnapshot[];
  totalDuration: number;
  totalPrice: number | null; // null μόνο αν ΚΑΜΙΑ υπηρεσία δεν έχει τιμή
  combinedName: string; // π.χ. «Ανδρικό κούρεμα + Παραδοσιακό ξύρισμα»
  primaryServiceId: string;
}

/**
 * Φορτώνει ΕΝΕΡΓΕΣ υπηρεσίες με τη σειρά που δόθηκαν (χωρίς διπλά).
 * Επιστρέφει null αν λείπει έστω μία (ανενεργή/ανύπαρκτη) → ο caller απορρίπτει.
 */
export async function loadServiceBundle(ids: string[]): Promise<ServiceBundle | null> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return null;

  const rows = await prisma.service.findMany({ where: { id: { in: unique }, active: true } });
  if (rows.length !== unique.length) return null;

  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = unique.map((id) => byId.get(id)!);

  const items: ServiceSnapshot[] = ordered.map((r) => ({
    serviceId: r.id,
    name: r.name,
    durationMin: r.durationMin,
    priceCents: r.priceCents,
  }));
  const totalDuration = items.reduce((s, i) => s + i.durationMin, 0);
  const anyPrice = items.some((i) => i.priceCents != null);
  const totalPrice = anyPrice ? items.reduce((s, i) => s + (i.priceCents ?? 0), 0) : null;
  const combinedName = items.map((i) => i.name).join(" + ");

  return { items, totalDuration, totalPrice, combinedName, primaryServiceId: items[0].serviceId };
}
