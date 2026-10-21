/**
 * ΜΗΧΑΝΗ ΔΙΑΘΕΣΙΜΟΤΗΤΑΣ (server-side)
 * --------------------------------------------------------------------------
 * Υπολογίζει πραγματικά διαθέσιμες ώρες βάσει: ωραρίου κουρέα, διάρκειας
 * υπηρεσίας, βήματος slot, χρόνου καθαρισμού (buffer) μεταξύ ραντεβού,
 * υπαρχουσών κρατήσεων (επικαλύψεις) και κλεισιμάτων/αδειών. Ώρα Αθήνας,
 * αποθήκευση σε UTC, σωστή διαχείριση DST.
 */
import { prisma } from "@/lib/db";
import { bookingConfig } from "@/config/booking";
import { athensWallToUtc, hmToMin, minToHm, weekdayOf, todayAthens, addDays } from "@/lib/datetime";

export interface Interval {
  start: Date;
  end: Date;
}

export interface BarberSlots {
  barberId: string;
  barberName: string;
  slots: string[]; // "HH:mm" (Αθήνα)
}

export interface DayAvailability {
  dateStr: string;
  perBarber: BarberSlots[];
  anySlots: string[]; // ένωση (για «χωρίς προτίμηση»)
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Καθαρός υπολογισμός slots ενός κουρέα για μια ημέρα. */
export function computeBarberSlots(params: {
  dateStr: string;
  durationMin: number;
  workIntervals: { open: string; close: string }[];
  bookingBusy: Interval[]; // υπάρχουσες κρατήσεις (service intervals)
  closureBusy: Interval[]; // κλεισίματα/άδειες
  nowUtc: Date;
  bufferMin?: number;
  stepMin?: number;
  minLeadMin?: number;
}): string[] {
  const { dateStr, durationMin, workIntervals, bookingBusy, closureBusy, nowUtc } = params;
  const step = params.stepMin ?? bookingConfig.slotStepMin;
  const buffer = params.bufferMin ?? bookingConfig.bufferMin;
  const minLead = params.minLeadMin ?? bookingConfig.minLeadMinutes;
  const earliest = new Date(nowUtc.getTime() + minLead * 60000);
  const out: string[] = [];

  for (const wi of workIntervals) {
    const openMin = hmToMin(wi.open);
    const closeMin = hmToMin(wi.close);
    for (let m = openMin; m + durationMin <= closeMin; m += step) {
      const hm = minToHm(m);
      const startUtc = athensWallToUtc(dateStr, hm);
      const endUtc = new Date(startUtc.getTime() + durationMin * 60000);
      const reservedEnd = new Date(endUtc.getTime() + buffer * 60000);
      if (startUtc < earliest) continue;
      // Το service δεν πρέπει να πέφτει σε κλείσιμο.
      if (closureBusy.some((c) => overlaps(startUtc, endUtc, c.start, c.end))) continue;
      // Με buffer μεταξύ κρατήσεων (επεκτείνουμε και την υπάρχουσα κατά buffer).
      const clash = bookingBusy.some((b) =>
        overlaps(startUtc, reservedEnd, b.start, new Date(b.end.getTime() + buffer * 60000)),
      );
      if (!clash) out.push(hm);
    }
  }
  return Array.from(new Set(out)).sort();
}

interface AvailabilityContext {
  barbers: {
    id: string;
    name: string;
    schedules: { dayOfWeek: number; open: string; close: string }[];
  }[];
  bookings: { barberId: string; startAt: Date; endAt: Date }[];
  closures: { barberId: string | null; startAt: Date; endAt: Date }[];
  offers: { barberId: string; startAt: Date; endAt: Date }[];
}

async function loadContext(rangeStart: Date, rangeEnd: Date, barberId?: string): Promise<AvailabilityContext> {
  const now = new Date();
  const [barbers, bookings, closures, offers] = await Promise.all([
    prisma.barber.findMany({
      where: { active: true, ...(barberId ? { id: barberId } : {}) },
      orderBy: { order: "asc" },
      include: { schedules: true },
    }),
    prisma.booking.findMany({
      where: { status: "CONFIRMED", startAt: { gte: rangeStart, lt: rangeEnd } },
      select: { barberId: true, startAt: true, endAt: true },
    }),
    prisma.closure.findMany({
      where: { startAt: { lt: rangeEnd }, endAt: { gt: rangeStart } },
      select: { barberId: true, startAt: true, endAt: true },
    }),
    // Ενεργές προσφορές waitlist = προσωρινό hold στη θέση.
    prisma.waitlistOffer.findMany({
      where: { status: "PENDING", expiresAt: { gt: now }, startAt: { gte: rangeStart, lt: rangeEnd } },
      select: { barberId: true, startAt: true, endAt: true },
    }),
  ]);
  return {
    barbers: barbers.map((b) => ({
      id: b.id,
      name: b.name,
      schedules: b.schedules.map((s) => ({ dayOfWeek: s.dayOfWeek, open: s.open, close: s.close })),
    })),
    bookings,
    closures,
    offers,
  };
}

function computeDay(dateStr: string, durationMin: number, ctx: AvailabilityContext, nowUtc: Date): DayAvailability {
  const weekday = weekdayOf(dateStr);
  const perBarber: BarberSlots[] = ctx.barbers.map((b) => {
    const workIntervals = b.schedules
      .filter((s) => s.dayOfWeek === weekday)
      .map((s) => ({ open: s.open, close: s.close }))
      .sort((x, y) => hmToMin(x.open) - hmToMin(y.open));

    const bookingBusy: Interval[] = [
      ...ctx.bookings.filter((bk) => bk.barberId === b.id).map((bk) => ({ start: bk.startAt, end: bk.endAt })),
      // held slots από ενεργές προσφορές waitlist
      ...ctx.offers.filter((o) => o.barberId === b.id).map((o) => ({ start: o.startAt, end: o.endAt })),
    ];
    const closureBusy: Interval[] = ctx.closures
      .filter((c) => c.barberId === null || c.barberId === b.id)
      .map((c) => ({ start: c.startAt, end: c.endAt }));

    return {
      barberId: b.id,
      barberName: b.name,
      slots: computeBarberSlots({ dateStr, durationMin, workIntervals, bookingBusy, closureBusy, nowUtc }),
    };
  });
  const anySlots = Array.from(new Set(perBarber.flatMap((p) => p.slots))).sort();
  return { dateStr, perBarber, anySlots };
}

/** Διαθεσιμότητα μιας ημέρας. */
export async function getDayAvailability(params: {
  dateStr: string;
  durationMin: number;
  barberId?: string;
}): Promise<DayAvailability> {
  const dayStart = athensWallToUtc(params.dateStr, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 36 * 3600 * 1000);
  const ctx = await loadContext(dayStart, dayEnd, params.barberId);
  return computeDay(params.dateStr, params.durationMin, ctx, new Date());
}

/** Πρώτη διαθέσιμη ώρα που χωρά ολόκληρη την υπηρεσία (+buffers). */
export async function findFirstAvailable(params: {
  durationMin: number;
  barberId?: string;
  fromDate?: string;
}): Promise<{ dateStr: string; time: string; barberId: string; barberName: string } | null> {
  const start = params.fromDate ?? todayAthens();
  const lastDate = addDays(todayAthens(), bookingConfig.maxAdvanceDays);
  const rangeStart = athensWallToUtc(start, "00:00");
  const rangeEnd = new Date(athensWallToUtc(lastDate, "00:00").getTime() + 36 * 3600 * 1000);
  const ctx = await loadContext(rangeStart, rangeEnd, params.barberId);
  const now = new Date();

  let dateStr = start;
  for (let i = 0; i <= bookingConfig.maxAdvanceDays && dateStr <= lastDate; i++) {
    const day = computeDay(dateStr, params.durationMin, ctx, now);
    for (const pb of day.perBarber) {
      if (pb.slots.length > 0) {
        // Για «χωρίς προτίμηση» επιστρέφουμε τον πρώτο κουρέα με την πρωιμότερη ώρα.
        const earliest = pb.slots[0];
        // Βρες τον κουρέα με την απόλυτα πρωιμότερη ώρα της ημέρας.
        let best = { barberId: pb.barberId, barberName: pb.barberName, time: earliest };
        for (const p of day.perBarber) {
          if (p.slots.length && p.slots[0] < best.time) {
            best = { barberId: p.barberId, barberName: p.barberName, time: p.slots[0] };
          }
        }
        return { dateStr, time: best.time, barberId: best.barberId, barberName: best.barberName };
      }
    }
    dateStr = addDays(dateStr, 1);
  }
  return null;
}

/** Έλεγχος αν το σύστημα είναι έτοιμο για δημόσιες κρατήσεις. */
export async function bookingSystemReady(): Promise<{
  ready: boolean;
  hasServices: boolean;
  hasBarbers: boolean;
  hasSchedule: boolean;
}> {
  const [activeServices, activeBarbers, schedules] = await Promise.all([
    prisma.service.count({ where: { active: true } }),
    prisma.barber.count({ where: { active: true } }),
    prisma.barberSchedule.count(),
  ]);
  const hasServices = activeServices > 0;
  const hasBarbers = activeBarbers > 0;
  const hasSchedule = schedules > 0;
  return { ready: hasServices && hasBarbers && hasSchedule, hasServices, hasBarbers, hasSchedule };
}
