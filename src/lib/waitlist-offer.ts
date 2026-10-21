/**
 * Waitlist offer flow (server-only).
 * --------------------------------------------------------------------------
 * - createOffer: ελέγχει ότι η θέση είναι ελεύθερη, δημιουργεί προσφορά = HOLD
 *   με πραγματική server-side λήξη, ειδοποιεί τον πελάτη (inbox + push).
 * - acceptOffer: ατομικό flip PENDING→ACCEPTED (ένας νικητής σε ταυτόχρονες
 *   αποδοχές), μετά δημιουργεί την οριστική κράτηση.
 * - declineOffer / expireOffers: ελευθερώνουν το hold.
 * Η προσφορά ΔΕΝ είναι επιβεβαιωμένο ραντεβού μέχρι την αποδοχή.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { bookingConfig } from "@/config/booking";
import { generateCancelToken } from "@/lib/codes";
import { createBooking } from "@/lib/booking-service";
import { enqueueNotification } from "@/lib/notify-events";
import { athensWallToUtc, weekdayOf, hmToMin, athensParts, formatAthensDateLong, formatAthensTime } from "@/lib/datetime";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function overlaps(aS: Date, aE: Date, bS: Date, bE: Date) {
  return aS < bE && bS < aE;
}
function plusMin(d: Date, m: number) {
  return new Date(d.getTime() + m * 60000);
}

export type OfferResult =
  | { ok: true; token: string; offerId: string }
  | { ok: false; error: string };

/** Δημιουργία προσφοράς (hold) για αίτημα waitlist. */
export async function createOffer(input: {
  waitlistId: string;
  barberId: string;
  date: string;
  time: string;
  ttlMinutes?: number;
}): Promise<OfferResult> {
  const ttl = input.ttlMinutes ?? 60;
  const wl = await prisma.waitlist.findUnique({ where: { id: input.waitlistId }, include: { service: true } });
  if (!wl) return { ok: false, error: "Το αίτημα δεν βρέθηκε." };
  if (wl.status === "CONVERTED") return { ok: false, error: "Το αίτημα έχει ήδη μετατραπεί σε κράτηση." };

  const startUtc = athensWallToUtc(input.date, input.time);
  const endUtc = plusMin(startUtc, wl.service.durationMin);
  const buffer = bookingConfig.bufferMin;
  const reservedEnd = plusMin(endUtc, buffer);
  const startMin = hmToMin(input.time);
  const endMin = startMin + wl.service.durationMin;
  const weekday = weekdayOf(input.date);
  const dayStart = athensWallToUtc(input.date, "00:00");
  const dayEnd = plusMin(dayStart, 36 * 60);

  try {
    const created = await prisma.$transaction(async (tx): Promise<OfferResult> => {
      const barber = await tx.barber.findFirst({
        where: { id: input.barberId, active: true },
        include: { schedules: { where: { dayOfWeek: weekday } } },
      });
      if (!barber) return { ok: false, error: "Μη έγκυρος κουρέας." };
      const inHours = barber.schedules.some((s) => hmToMin(s.open) <= startMin && endMin <= hmToMin(s.close));
      if (!inHours) return { ok: false, error: "Η ώρα είναι εκτός ωραρίου του κουρέα." };

      const [bookings, closures, offers] = await Promise.all([
        tx.booking.findMany({ where: { status: "CONFIRMED", barberId: input.barberId, startAt: { gte: dayStart, lt: dayEnd } }, select: { startAt: true, endAt: true } }),
        tx.closure.findMany({ where: { startAt: { lt: dayEnd }, endAt: { gt: dayStart } }, select: { barberId: true, startAt: true, endAt: true } }),
        tx.waitlistOffer.findMany({ where: { status: "PENDING", expiresAt: { gt: new Date() }, barberId: input.barberId, startAt: { gte: dayStart, lt: dayEnd } }, select: { startAt: true, endAt: true } }),
      ]);
      if (closures.some((c) => (c.barberId === null || c.barberId === input.barberId) && overlaps(startUtc, endUtc, c.startAt, c.endAt)))
        return { ok: false, error: "Η ώρα είναι κλειστή." };
      if (bookings.some((b) => overlaps(startUtc, reservedEnd, b.startAt, plusMin(b.endAt, buffer))))
        return { ok: false, error: "Η ώρα είναι ήδη κατειλημμένη." };
      if (offers.some((o) => overlaps(startUtc, reservedEnd, o.startAt, plusMin(o.endAt, buffer))))
        return { ok: false, error: "Η ώρα έχει ήδη προσφερθεί σε άλλον." };

      const token = generateCancelToken();
      const offer = await tx.waitlistOffer.create({
        data: {
          waitlistId: wl.id,
          customerId: wl.customerId,
          serviceId: wl.serviceId,
          barberId: input.barberId,
          startAt: startUtc,
          endAt: endUtc,
          token,
          status: "PENDING",
          expiresAt: new Date(Date.now() + ttl * 60000),
        },
      });
      await tx.waitlist.update({ where: { id: wl.id }, data: { status: "OFFERED" } });

      // Ειδοποίηση πελάτη (inbox + push), αν είναι συνδεδεμένος.
      if (wl.customerId) {
        const dateStr = athensParts(startUtc).dateStr;
        await enqueueNotification(tx, {
          customerId: wl.customerId,
          type: "waitlist_offer",
          title: "Ελευθερώθηκε θέση!",
          body: `${wl.service.name} — ${formatAthensDateLong(dateStr)} στις ${formatAthensTime(startUtc)}. Αποδοχή πριν λήξει η προσφορά.`,
          dedupeKey: `offer:${offer.id}`,
          data: { screen: "offer", token, acceptUrl: `${SITE_URL}/rantevou/offer/${token}` },
        });
      }
      return { ok: true, token, offerId: offer.id };
    });
    return created;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Σφάλμα δημιουργίας προσφοράς." };
  }
}

export interface OfferView {
  status: string;
  expired: boolean;
  serviceName: string;
  barberName: string;
  startAtISO: string;
  durationMin: number;
  priceCents: number | null;
}

export async function getOfferView(token: string): Promise<OfferView | null> {
  const offer = await prisma.waitlistOffer.findUnique({ where: { token } });
  if (!offer) return null;
  const [service, barber] = await Promise.all([
    prisma.service.findUnique({ where: { id: offer.serviceId } }),
    prisma.barber.findUnique({ where: { id: offer.barberId } }),
  ]);
  return {
    status: offer.status,
    expired: offer.status === "PENDING" && offer.expiresAt < new Date(),
    serviceName: service?.name ?? "",
    barberName: barber?.name ?? "",
    startAtISO: offer.startAt.toISOString(),
    durationMin: service?.durationMin ?? 0,
    priceCents: service?.priceCents ?? null,
  };
}

export type AcceptResult = { ok: true; code: string; cancelToken: string } | { ok: false; error: string };

/** Αποδοχή προσφοράς → οριστική κράτηση. Ασφαλές σε ταυτόχρονες αποδοχές. */
export async function acceptOffer(token: string): Promise<AcceptResult> {
  const offer = await prisma.waitlistOffer.findUnique({ where: { token }, include: { waitlist: true } });
  if (!offer) return { ok: false, error: "Η προσφορά δεν βρέθηκε." };
  if (offer.status === "ACCEPTED" && offer.bookingId) {
    const bk = await prisma.booking.findUnique({ where: { id: offer.bookingId }, select: { code: true, cancelToken: true } });
    if (bk) return { ok: true, code: bk.code, cancelToken: bk.cancelToken };
  }

  // Ατομικό flip: μόνο μία αποδοχή περνά (concurrency guard).
  const claim = await prisma.waitlistOffer.updateMany({
    where: { token, status: "PENDING", expiresAt: { gt: new Date() } },
    data: { status: "ACCEPTED" },
  });
  if (claim.count !== 1) {
    const fresh = await prisma.waitlistOffer.findUnique({ where: { token } });
    if (fresh?.status === "ACCEPTED") return { ok: false, error: "Η προσφορά έχει ήδη γίνει αποδεκτή." };
    return { ok: false, error: "Η προσφορά έληξε ή δεν είναι πλέον διαθέσιμη." };
  }

  const dateStr = athensParts(offer.startAt).dateStr;
  const time = formatAthensTime(offer.startAt);
  const name = offer.waitlist?.customerName ?? "Πελάτης";
  const phone = offer.waitlist?.customerPhone ?? "";

  // Η προσφορά είναι πλέον ACCEPTED (δεν μετράει ως hold) → η θέση είναι ελεύθερη.
  const result = await createBooking(
    { serviceId: offer.serviceId, barberId: offer.barberId, date: dateStr, time, customerName: name, customerPhone: phone },
    "admin",
    `accept:${offer.id}`,
    offer.customerId ?? undefined,
  );

  if (!result.ok) {
    // Απρόσμενο (η θέση ήταν held) — επαναφορά σε EXPIRED ώστε να μην κολλήσει.
    await prisma.waitlistOffer.update({ where: { id: offer.id }, data: { status: "EXPIRED" } }).catch(() => {});
    return { ok: false, error: "Η θέση δεν είναι πλέον διαθέσιμη." };
  }

  const createdBk = await prisma.booking.findUnique({ where: { code: result.booking.code }, select: { id: true } });
  await prisma.waitlistOffer.update({ where: { id: offer.id }, data: { bookingId: createdBk?.id ?? null } }).catch(() => {});
  if (offer.waitlistId) await prisma.waitlist.update({ where: { id: offer.waitlistId }, data: { status: "CONVERTED" } }).catch(() => {});

  return { ok: true, code: result.booking.code, cancelToken: result.booking.cancelToken };
}

export async function declineOffer(token: string): Promise<{ ok: boolean }> {
  await prisma.waitlistOffer.updateMany({ where: { token, status: "PENDING" }, data: { status: "DECLINED" } });
  return { ok: true };
}

/** Λήξη εκκρεμών προσφορών (καλείται από τον worker). */
export async function expireOffers(): Promise<{ expired: number }> {
  const res = await prisma.waitlistOffer.updateMany({
    where: { status: "PENDING", expiresAt: { lte: new Date() } },
    data: { status: "EXPIRED" },
  });
  // Τα αιτήματα που ήταν OFFERED αλλά έληξαν → ξανά OPEN (για νέα προσφορά).
  // (Προαιρετικό: εδώ τα αφήνουμε όπως είναι· ο admin μπορεί να ξαναπροσφέρει.)
  return { expired: res.count };
}
