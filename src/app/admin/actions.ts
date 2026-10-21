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
