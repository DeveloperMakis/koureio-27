"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAdminId } from "@/lib/auth";
import { athensWallToUtc, addDays, athensParts, formatAthensDateLong, formatAthensTime } from "@/lib/datetime";
import { serviceUpdateSchema, closureCreateSchema } from "@/lib/validation";
import { notifyCancellationSms } from "@/lib/notify";
import { enqueueNotification } from "@/lib/notify-events";
import { createOffer } from "@/lib/waitlist-offer";
import { greekHolidays } from "@/lib/greek-holidays";
import { setToken, syncInstagram } from "@/lib/instagram";

async function guard() {
  const id = await getCurrentAdminId();
  if (!id) redirect("/admin/login");
  return id;
}

function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/rantevou");
}

export async function updateServiceAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const parsed = serviceUpdateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    durationMin: formData.get("durationMin"),
    priceEuros: formData.get("priceEuros"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
    order: formData.get("order"),
  });
  if (!parsed.success) return;

  const d = parsed.data;
  const priceCents =
    d.priceEuros === "" || d.priceEuros === undefined ? null : Math.round(Number(d.priceEuros) * 100);

  await prisma.service.update({
    where: { id },
    data: {
      name: d.name,
      description: d.description,
      durationMin: d.durationMin,
      priceCents,
      active: d.active,
      order: d.order,
    },
  });

  revalidatePath("/admin/services");
  revalidatePublic();
}

export async function createClosureAction(formData: FormData) {
  await guard();
  const parsed = closureCreateSchema.safeParse({
    date: formData.get("date"),
    allDay: formData.get("allDay") === "on" || formData.get("allDay") === "true",
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
    barberId: formData.get("barberId") || undefined,
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return;
  const d = parsed.data;

  let startAt: Date;
  let endAt: Date;
  if (d.allDay || !d.startTime || !d.endTime) {
    startAt = athensWallToUtc(d.date, "00:00");
    endAt = athensWallToUtc(addDays(d.date, 1), "00:00");
  } else {
    startAt = athensWallToUtc(d.date, d.startTime);
    endAt = athensWallToUtc(d.date, d.endTime);
    if (endAt <= startAt) return;
  }

  await prisma.closure.create({
    data: {
      barberId: d.barberId && d.barberId !== "" ? d.barberId : null,
      startAt,
      endAt,
      reason: d.reason || null,
    },
  });

  revalidatePath("/admin/closures");
  revalidatePublic();
}

export async function deleteClosureAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.closure.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/closures");
  revalidatePublic();
}

/**
 * Προσθέτει τις επίσημες ελληνικές αργίες ενός έτους ως ολοήμερα κλεισίματα
 * (όλο το κατάστημα). Idempotent: παραλείπει όσες ήδη υπάρχουν ως ολοήμερο
 * κλείσιμο εκείνη την ημέρα.
 */
export async function seedGreekHolidaysAction(formData: FormData) {
  await guard();
  const year = Number(formData.get("year"));
  if (!Number.isInteger(year) || year < 2024 || year > 2099) return;

  const holidays = greekHolidays(year);
  const yearStart = athensWallToUtc(`${year}-01-01`, "00:00");
  const yearEnd = athensWallToUtc(`${year + 1}-01-01`, "00:00");

  // Υπάρχοντα ολοήμερα κλεισίματα καταστήματος μέσα στο έτος.
  const existing = await prisma.closure.findMany({
    where: { barberId: null, startAt: { gte: yearStart, lt: yearEnd } },
    select: { startAt: true, endAt: true },
  });
  const coversDay = (dateStr: string) => {
    const dayStart = athensWallToUtc(dateStr, "00:00");
    const dayEnd = athensWallToUtc(addDays(dateStr, 1), "00:00");
    return existing.some((c) => c.startAt <= dayStart && c.endAt >= dayEnd);
  };

  const toCreate = holidays
    .filter((h) => !coversDay(h.date))
    .map((h) => ({
      barberId: null,
      startAt: athensWallToUtc(h.date, "00:00"),
      endAt: athensWallToUtc(addDays(h.date, 1), "00:00"),
      reason: `Αργία: ${h.name}`,
    }));

  if (toCreate.length > 0) {
    await prisma.closure.createMany({ data: toCreate });
  }
  revalidatePath("/admin/closures");
  revalidatePublic();
}

// ---- Προσφορές / ανακοινώσεις προς πελάτες ----

export async function createPromotionAction(formData: FormData) {
  await guard();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 2 || body.length < 2) return;
  await prisma.promotion.create({ data: { title: title.slice(0, 120), body: body.slice(0, 500) } });
  revalidatePath("/admin/promotions");
}

export async function deletePromotionAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.promotion.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/promotions");
}

// ---- Instagram ----

export async function setInstagramTokenAction(formData: FormData) {
  await guard();
  const token = String(formData.get("token") ?? "").trim();
  if (token.length < 20) return;
  await setToken(token);
  // Πρώτος συγχρονισμός αμέσως.
  await syncInstagram().catch(() => {});
  revalidatePath("/admin/instagram");
  revalidatePublic();
}

export async function syncInstagramAction() {
  await guard();
  await syncInstagram().catch(() => {});
  revalidatePath("/admin/instagram");
  revalidatePublic();
}

/**
 * Αποστολή προσφοράς σε ΟΛΟΥΣ τους πελάτες (inbox + push μέσω outbox).
 * Idempotent ανά πελάτη (dedupeKey). Επαναλαμβανόμενη κλήση δεν ξαναστέλνει.
 */
export async function sendPromotionAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const promo = await prisma.promotion.findUnique({ where: { id } });
  if (!promo) return;

  const customers = await prisma.customer.findMany({
    where: { notifyPush: true },
    select: { id: true },
  });
  for (const c of customers) {
    await enqueueNotification(prisma, {
      customerId: c.id,
      type: "promotion",
      title: promo.title,
      body: promo.body,
      dedupeKey: `promo:${promo.id}:${c.id}`,
      data: { screen: "notifications", promotionId: promo.id },
    });
  }
  await prisma.promotion.update({
    where: { id },
    data: { sentAt: new Date(), recipients: customers.length },
  });
  revalidatePath("/admin/promotions");
}

export async function createOfferAction(formData: FormData) {
  await guard();
  const waitlistId = String(formData.get("waitlistId") ?? "");
  const barberId = String(formData.get("barberId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const ttl = Number(formData.get("ttlMinutes") ?? 60);
  if (!waitlistId || !barberId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return;

  await createOffer({ waitlistId, barberId, date, time, ttlMinutes: Number.isFinite(ttl) ? ttl : 60 });
  revalidatePath("/admin/waitlist");
  revalidatePublic();
}

export async function setBookingStatusAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const allowed = ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"];
  if (!id || !allowed.includes(status)) return;

  const prior = await prisma.booking.findUnique({ where: { id }, select: { status: true } });

  await prisma.booking.update({
    where: { id },
    data: {
      status,
      // Στην ακύρωση ελευθερώνουμε τη διαθεσιμότητα.
      slotKey: status === "CANCELLED" ? null : undefined,
    },
  });

  // Ακύρωση από τον ιδιοκτήτη → SMS (αν υπάρχει πάροχος) + ειδοποίηση εφαρμογής.
  if (status === "CANCELLED" && prior?.status === "CONFIRMED") {
    try {
      await notifyCancellationSms(id);
    } catch {
      // Η ακύρωση ισχύει ανεξάρτητα από την ειδοποίηση· το σφάλμα καταγράφεται στο log.
    }
    try {
      const bk = await prisma.booking.findUnique({
        where: { id },
        select: { customerId: true, serviceName: true, startAt: true, code: true },
      });
      if (bk?.customerId) {
        await prisma.notificationOutbox.deleteMany({ where: { bookingId: id, type: "reminder", status: "PENDING" } });
        await prisma.inAppNotification.deleteMany({ where: { bookingId: id, type: "reminder", readAt: null } });
        const dateStr = athensParts(bk.startAt).dateStr;
        await enqueueNotification(prisma, {
          customerId: bk.customerId,
          type: "cancellation",
          title: "Το ραντεβού ακυρώθηκε",
          body: `${bk.serviceName} — ${formatAthensDateLong(dateStr)} στις ${formatAthensTime(bk.startAt)}`,
          dedupeKey: `cancel:${bk.code}`,
          bookingId: id,
          data: { screen: "booking", code: bk.code },
        });
      }
    } catch {
      /* η ακύρωση ισχύει ανεξάρτητα από την ειδοποίηση */
    }
  }

  revalidatePath("/admin");
  revalidatePublic();
}
