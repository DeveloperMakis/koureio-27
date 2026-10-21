/**
 * ΥΠΗΡΕΣΙΑ ΚΡΑΤΗΣΕΩΝ (server-only)
 * --------------------------------------------------------------------------
 * - Δημιουργία με επανέλεγχο διαθεσιμότητας μέσα σε transaction.
 * - Αποτροπή διπλοκράτησης: overlap check (με buffer) + μοναδικό `slotKey`.
 * - Idempotency: ίδιο `idempotencyKey` → επιστρέφει την ίδια κράτηση (anti διπλό submit).
 * - Αλλαγή ώρας (reschedule) ως ενιαία συναλλαγή: αν αποτύχει, μένει η παλιά.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { bookingConfig } from "@/config/booking";
import { generateBookingCode, generateCancelToken } from "@/lib/codes";
import { athensWallToUtc, weekdayOf, hmToMin, addDays, todayAthens, athensParts, formatAthensDateLong, formatAthensTime } from "@/lib/datetime";
import { enqueueNotification } from "@/lib/notify-events";
import { loadServiceBundle } from "@/lib/service-bundle";
import { normalizeServiceIds, type CreateBookingInput } from "@/lib/validation";

export type BookingErrorCode =
  | "SERVICE_NOT_FOUND"
  | "NO_BARBER"
  | "OUTSIDE_HOURS"
  | "SLOT_TAKEN"
  | "TOO_SOON"
  | "TOO_FAR"
  | "TOO_LATE"
  | "IDEMPOTENCY_CONFLICT"
  | "NOT_FOUND"
  | "NOT_CHANGEABLE"
  | "SYSTEM_NOT_READY"
  | "UNKNOWN";

export interface CreatedBooking {
  code: string;
  cancelToken: string;
  startAt: Date;
  endAt: Date;
  serviceName: string;
  durationMin: number;
  priceCents: number | null;
  barberId: string;
  barberName: string;
}

export type BookingResult =
  | { ok: true; booking: CreatedBooking; reused?: boolean }
  | { ok: false; error: BookingErrorCode };

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
function plusMin(d: Date, m: number): Date {
  return new Date(d.getTime() + m * 60000);
}

export async function createBooking(
  input: CreateBookingInput,
  source: "online" | "admin" = "online",
  idempotencyKey?: string,
  customerId?: string,
): Promise<BookingResult> {
  // Μία ή περισσότερες υπηρεσίες (διατηρείται η σειρά, πρώτη = κύρια).
  const serviceIds = normalizeServiceIds(input);
  const primaryServiceId = serviceIds[0];

  // Idempotency: αν υπάρχει ήδη κράτηση με το ίδιο κλειδί, επέστρεψέ την.
  if (idempotencyKey) {
    const existing = await prisma.booking.findUnique({
      where: { idempotencyKey },
      include: { barber: true },
    });
    if (existing) {
      // Το ίδιο key με ΔΙΑΦΟΡΕΤΙΚΟ payload (άλλη υπηρεσία/ώρα) → σύγκρουση, όχι σιωπηλή επιστροφή.
      const reqStart = athensWallToUtc(input.date, input.time);
      if (existing.serviceId !== primaryServiceId || existing.startAt.getTime() !== reqStart.getTime()) {
        return { ok: false, error: "IDEMPOTENCY_CONFLICT" };
      }
      return {
        ok: true,
        reused: true,
        booking: {
          code: existing.code,
          cancelToken: existing.cancelToken,
          startAt: existing.startAt,
          endAt: existing.endAt,
          serviceName: existing.serviceName,
          durationMin: existing.durationMin,
          priceCents: existing.priceCents,
          barberId: existing.barberId,
          barberName: existing.barber.name,
        },
      };
    }
  }

  const bundle = await loadServiceBundle(serviceIds);
  if (!bundle) return { ok: false, error: "SERVICE_NOT_FOUND" };

  const startUtc = athensWallToUtc(input.date, input.time);
  const endUtc = plusMin(startUtc, bundle.totalDuration);
  const buffer = bookingConfig.bufferMin;
  const now = new Date();

  if (source === "online") {
    if (startUtc.getTime() < now.getTime() + bookingConfig.minLeadMinutes * 60000) {
      return { ok: false, error: "TOO_SOON" };
    }
    if (input.date > addDays(todayAthens(), bookingConfig.maxAdvanceDays)) {
      return { ok: false, error: "TOO_FAR" };
    }
  }

  const startMin = hmToMin(input.time);
  const endMin = startMin + bundle.totalDuration;
  const weekday = weekdayOf(input.date);
  const dayStart = athensWallToUtc(input.date, "00:00");
  const dayEnd = plusMin(dayStart, 36 * 60);

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateBookingCode();
    const cancelToken = generateCancelToken();
    try {
      const result: BookingResult = await prisma.$transaction(async (tx): Promise<BookingResult> => {
        const barbers = await tx.barber.findMany({
          where: { active: true, ...(input.barberId ? { id: input.barberId } : {}) },
          orderBy: { order: "asc" },
          include: { schedules: { where: { dayOfWeek: weekday } } },
        });
        if (barbers.length === 0) return { ok: false, error: "NO_BARBER" };

        const bookings = await tx.booking.findMany({
          where: { status: "CONFIRMED", startAt: { gte: dayStart, lt: dayEnd } },
          select: { barberId: true, startAt: true, endAt: true },
        });
        const closures = await tx.closure.findMany({
          where: { startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
          select: { barberId: true, startAt: true, endAt: true },
        });
        // Ενεργές προσφορές waitlist = held θέσεις (δεν τις παίρνει άλλη κράτηση).
        const offers = await tx.waitlistOffer.findMany({
          where: { status: "PENDING", expiresAt: { gt: new Date() }, startAt: { gte: dayStart, lt: dayEnd } },
          select: { barberId: true, startAt: true, endAt: true },
        });

        const reservedEnd = plusMin(endUtc, buffer);
        let worksAtAll = false;
        let worksButBusy = false;
        let chosen: (typeof barbers)[number] | null = null;

        for (const b of barbers) {
          const inHours = b.schedules.some((s) => hmToMin(s.open) <= startMin && endMin <= hmToMin(s.close));
          if (!inHours) continue;
          worksAtAll = true;
          const closed = closures.some(
            (c) => (c.barberId === null || c.barberId === b.id) && overlaps(startUtc, endUtc, c.startAt, c.endAt),
          );
          if (closed) continue;
          const busy =
            bookings.some((bk) => bk.barberId === b.id && overlaps(startUtc, reservedEnd, bk.startAt, plusMin(bk.endAt, buffer))) ||
            offers.some((o) => o.barberId === b.id && overlaps(startUtc, reservedEnd, o.startAt, plusMin(o.endAt, buffer)));
          if (busy) {
            worksButBusy = true;
            continue;
          }
          chosen = b;
          break;
        }

        if (!chosen) {
          if (worksButBusy) return { ok: false, error: "SLOT_TAKEN" };
          return { ok: false, error: "OUTSIDE_HOURS" };
        }

        const slotKey = `${chosen.id}|${startUtc.toISOString()}`;
        const booking = await tx.booking.create({
          data: {
            code,
            cancelToken,
            idempotencyKey: idempotencyKey ?? null,
            customerId: customerId ?? null,
            serviceId: bundle.primaryServiceId,
            barberId: chosen.id,
            startAt: startUtc,
            endAt: endUtc,
            serviceName: bundle.combinedName,
            priceCents: bundle.totalPrice,
            durationMin: bundle.totalDuration,
            customerName: input.customerName,
            customerPhone: input.customerPhone ?? "",
            customerEmail: input.customerEmail || null,
            notes: input.notes || null,
            status: "CONFIRMED",
            source,
            slotKey,
            // Γραμμές υπηρεσιών (στιγμιότυπο ανά υπηρεσία).
            items: {
              create: bundle.items.map((it, idx) => ({
                serviceId: it.serviceId,
                name: it.name,
                durationMin: it.durationMin,
                priceCents: it.priceCents,
                order: idx,
              })),
            },
          },
        });

        // Transactional outbox: η ειδοποίηση επιβεβαίωσης στην ίδια συναλλαγή
        // (μόνο για συνδεδεμένο πελάτη της εφαρμογής).
        if (customerId) {
          const dateStr = athensParts(startUtc).dateStr;
          await enqueueNotification(tx, {
            customerId,
            type: "confirmation",
            title: "Το ραντεβού σου επιβεβαιώθηκε",
            body: `${bundle.combinedName} — ${formatAthensDateLong(dateStr)} στις ${formatAthensTime(startUtc)}`,
            dedupeKey: `conf:${booking.code}`,
            bookingId: booking.id,
            data: { screen: "booking", code: booking.code },
          });
        }

        return {
          ok: true,
          booking: {
            code: booking.code,
            cancelToken: booking.cancelToken,
            startAt: booking.startAt,
            endAt: booking.endAt,
            serviceName: booking.serviceName,
            durationMin: booking.durationMin,
            priceCents: booking.priceCents,
            barberId: chosen.id,
            barberName: chosen.name,
          },
        };
      });
      return result;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const target = Array.isArray(e.meta?.target)
          ? (e.meta?.target as string[]).join(",")
          : String(e.meta?.target ?? "");
        if (target.includes("slotKey")) return { ok: false, error: "SLOT_TAKEN" };
        if (target.includes("idempotencyKey")) {
          // Ταυτόχρονο διπλό submit με ίδιο κλειδί — επέστρεψε την υπάρχουσα.
          const existing = await prisma.booking.findUnique({
            where: { idempotencyKey: idempotencyKey! },
            include: { barber: true },
          });
          if (existing) {
            return {
              ok: true,
              reused: true,
              booking: {
                code: existing.code,
                cancelToken: existing.cancelToken,
                startAt: existing.startAt,
                endAt: existing.endAt,
                serviceName: existing.serviceName,
                durationMin: existing.durationMin,
                priceCents: existing.priceCents,
                barberId: existing.barberId,
                barberName: existing.barber.name,
              },
            };
          }
        }
        continue; // σύγκρουση κωδικού → νέα προσπάθεια
      }
      throw e;
    }
  }
  return { ok: false, error: "UNKNOWN" };
}

/** Αλλαγή ώρας/κουρέα ως ενιαία συναλλαγή — αν αποτύχει, μένει η παλιά. */
export async function rescheduleBooking(
  token: string,
  change: { date: string; time: string; barberId?: string },
): Promise<BookingResult> {
  const booking = await prisma.booking.findUnique({ where: { cancelToken: token } });
  if (!booking) return { ok: false, error: "NOT_FOUND" };
  if (booking.status !== "CONFIRMED") return { ok: false, error: "NOT_CHANGEABLE" };

  // Δεν επιτρέπεται εκπρόθεσμη αλλαγή για παράκαμψη του ορίου ακύρωσης:
  // αν το ΑΡΧΙΚΟ ραντεβού είναι εντός του παραθύρου ακύρωσης, μπλοκάρεται.
  if ((booking.startAt.getTime() - Date.now()) / 3600000 < bookingConfig.selfCancelHours) {
    return { ok: false, error: "TOO_LATE" };
  }

  const duration = booking.durationMin;
  const buffer = bookingConfig.bufferMin;
  const startUtc = athensWallToUtc(change.date, change.time);
  const endUtc = plusMin(startUtc, duration);
  const reservedEnd = plusMin(endUtc, buffer);
  const now = new Date();

  if (startUtc.getTime() < now.getTime() + bookingConfig.minLeadMinutes * 60000) {
    return { ok: false, error: "TOO_SOON" };
  }
  if (change.date > addDays(todayAthens(), bookingConfig.maxAdvanceDays)) {
    return { ok: false, error: "TOO_FAR" };
  }

  const targetBarberId = change.barberId || booking.barberId;
  const startMin = hmToMin(change.time);
  const endMin = startMin + duration;
  const weekday = weekdayOf(change.date);
  const dayStart = athensWallToUtc(change.date, "00:00");
  const dayEnd = plusMin(dayStart, 36 * 60);

  try {
    return await prisma.$transaction(async (tx): Promise<BookingResult> => {
      const barber = await tx.barber.findFirst({
        where: { id: targetBarberId, active: true },
        include: { schedules: { where: { dayOfWeek: weekday } } },
      });
      if (!barber) return { ok: false, error: "NO_BARBER" };

      const inHours = barber.schedules.some((s) => hmToMin(s.open) <= startMin && endMin <= hmToMin(s.close));
      if (!inHours) return { ok: false, error: "OUTSIDE_HOURS" };

      const [others, closures] = await Promise.all([
        tx.booking.findMany({
          where: {
            status: "CONFIRMED",
            barberId: targetBarberId,
            startAt: { gte: dayStart, lt: dayEnd },
            id: { not: booking.id },
          },
          select: { startAt: true, endAt: true },
        }),
        tx.closure.findMany({
          where: { startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
          select: { barberId: true, startAt: true, endAt: true },
        }),
      ]);

      const closed = closures.some(
        (c) => (c.barberId === null || c.barberId === targetBarberId) && overlaps(startUtc, endUtc, c.startAt, c.endAt),
      );
      if (closed) return { ok: false, error: "OUTSIDE_HOURS" };

      const busy = others.some((o) => overlaps(startUtc, reservedEnd, o.startAt, plusMin(o.endAt, buffer)));
      if (busy) return { ok: false, error: "SLOT_TAKEN" };

      const slotKey = `${targetBarberId}|${startUtc.toISOString()}`;
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { startAt: startUtc, endAt: endUtc, barberId: targetBarberId, slotKey },
        include: { barber: true },
      });

      if (updated.customerId) {
        // Ακύρωσε παλιές εκκρεμείς υπενθυμίσεις (νέα θα δημιουργηθεί για τη νέα ώρα).
        await tx.notificationOutbox.deleteMany({ where: { bookingId: updated.id, type: "reminder", status: "PENDING" } });
        await tx.inAppNotification.deleteMany({ where: { bookingId: updated.id, type: "reminder", readAt: null } });
        const dateStr = athensParts(updated.startAt).dateStr;
        await enqueueNotification(tx, {
          customerId: updated.customerId,
          type: "change",
          title: "Αλλαγή ραντεβού",
          body: `Νέα ώρα: ${formatAthensDateLong(dateStr)} στις ${formatAthensTime(updated.startAt)}`,
          dedupeKey: `change:${updated.code}:${updated.startAt.toISOString()}`,
          bookingId: updated.id,
          data: { screen: "booking", code: updated.code },
        });
      }

      return {
        ok: true,
        booking: {
          code: updated.code,
          cancelToken: updated.cancelToken,
          startAt: updated.startAt,
          endAt: updated.endAt,
          serviceName: updated.serviceName,
          durationMin: updated.durationMin,
          priceCents: updated.priceCents,
          barberId: updated.barberId,
          barberName: updated.barber.name,
        },
      };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "SLOT_TAKEN" };
    }
    throw e;
  }
}

/** Ακύρωση με token — ελευθερώνει τη διαθεσιμότητα (slotKey → null). */
export async function cancelBookingByToken(token: string): Promise<{ ok: boolean; reason?: string }> {
  const booking = await prisma.booking.findUnique({ where: { cancelToken: token } });
  if (!booking) return { ok: false, reason: "NOT_FOUND" };
  if (booking.status === "CANCELLED") return { ok: true };
  if (booking.status !== "CONFIRMED") return { ok: false, reason: "NOT_CANCELLABLE" };

  const now = new Date();
  const hoursBefore = (booking.startAt.getTime() - now.getTime()) / 3600000;
  if (hoursBefore < bookingConfig.selfCancelHours) return { ok: false, reason: "TOO_LATE" };

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED", slotKey: null } });
    if (booking.customerId) {
      // Ακύρωσε εκκρεμείς υπενθυμίσεις + ειδοποίησε (inbox + push outbox).
      await tx.notificationOutbox.deleteMany({ where: { bookingId: booking.id, type: "reminder", status: "PENDING" } });
      await tx.inAppNotification.deleteMany({ where: { bookingId: booking.id, type: "reminder", readAt: null } });
      const dateStr = athensParts(booking.startAt).dateStr;
      await enqueueNotification(tx, {
        customerId: booking.customerId,
        type: "cancellation",
        title: "Το ραντεβού ακυρώθηκε",
        body: `${booking.serviceName} — ${formatAthensDateLong(dateStr)} στις ${formatAthensTime(booking.startAt)}`,
        dedupeKey: `cancel:${booking.code}`,
        bookingId: booking.id,
        data: { screen: "booking", code: booking.code },
      });
    }
  });
  return { ok: true };
}
