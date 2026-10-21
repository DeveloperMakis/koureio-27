/**
 * Background worker ειδοποιήσεων.
 * --------------------------------------------------------------------------
 * - scanReminders(): δημιουργεί υπενθυμίσεις για ραντεβού που μπαίνουν στο
 *   παράθυρο υπενθύμισης (idempotent, dedupeKey με την ώρα έναρξης).
 * - processOutbox(): παίρνει PENDING jobs (με ατομικό claim → ασφαλές με
 *   πολλούς workers), ελέγχει την ΤΡΕΧΟΥΣΑ κατάσταση πριν στείλει, στέλνει push,
 *   με backoff/retry. «ok» = αποδεκτό από τον πάροχο, όχι «παραδόθηκε».
 */
import { prisma } from "@/lib/db";
import { bookingConfig } from "@/config/booking";
import { enqueueNotification } from "@/lib/notify-events";
import { sendPushToCustomer } from "@/lib/push";
import { expireOffers } from "@/lib/waitlist-offer";
import { maybeSyncInstagram } from "@/lib/instagram";
import { athensParts, formatAthensDateLong, formatAthensTime } from "@/lib/datetime";

const MAX_ATTEMPTS = 5;
const BATCH = 25;

function backoffSeconds(attempts: number): number {
  return Math.min(30 * Math.pow(2, Math.max(0, attempts - 1)), 1800);
}

/**
 * Υπενθυμίσεις για CONFIRMED ραντεβού συνδεδεμένων πελατών, σε ΠΟΛΛΑΠΛΑ σημεία
 * πριν την ώρα (π.χ. 60 & 30 λεπτά). Κάθε offset → ξεχωριστή υπενθύμιση (dedupe).
 */
export async function scanReminders(): Promise<{ enqueued: number }> {
  const now = new Date();
  const offsets = [...bookingConfig.reminderOffsetsMin].sort((a, b) => b - a); // μεγαλύτερο πρώτα
  let enqueued = 0;

  for (const offset of offsets) {
    const until = new Date(now.getTime() + offset * 60000);
    const label = offset >= 60 ? (offset === 60 ? "σε 1 ώρα" : `σε ${Math.round(offset / 60)} ώρες`) : `σε ${offset} λεπτά`;

    const bookings = await prisma.booking.findMany({
      where: { status: "CONFIRMED", customerId: { not: null }, startAt: { gt: now, lte: until } },
      select: { id: true, code: true, customerId: true, serviceName: true, startAt: true },
    });

    for (const b of bookings) {
      if (!b.customerId) continue;
      const startISO = b.startAt.toISOString();
      const dateStr = athensParts(b.startAt).dateStr;
      const dedupeKey = `reminder:${b.code}:${offset}:${startISO}`;
      const before = await prisma.notificationOutbox.findUnique({ where: { dedupeKey } });
      if (before) continue;
      await enqueueNotification(prisma, {
        customerId: b.customerId,
        type: "reminder",
        title: `Υπενθύμιση ραντεβού (${label})`,
        body: `${b.serviceName} — ${formatAthensDateLong(dateStr)} στις ${formatAthensTime(b.startAt)}`,
        dedupeKey,
        bookingId: b.id,
        data: { screen: "booking", code: b.code, intendedStartISO: startISO },
      });
      enqueued++;
    }
  }
  return { enqueued };
}

export async function processOutbox(): Promise<{ sent: number; skipped: number; failed: number }> {
  const now = new Date();
  let sent = 0,
    skipped = 0,
    failed = 0;

  const candidates = await prisma.notificationOutbox.findMany({
    where: { status: "PENDING", scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
    take: BATCH,
    select: { id: true },
  });

  for (const c of candidates) {
    // Ατομικό claim: μόνο ένας worker περνά.
    const claim = await prisma.notificationOutbox.updateMany({
      where: { id: c.id, status: "PENDING" },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });
    if (claim.count !== 1) continue;

    const job = await prisma.notificationOutbox.findUnique({ where: { id: c.id } });
    if (!job) continue;

    try {
      const payload = JSON.parse(job.payload) as { title: string; body: string; data?: Record<string, unknown> };

      // Έλεγχος τρέχουσας κατάστασης για υπενθυμίσεις (ακυρωμένο/αλλαγμένο → skip).
      if (job.type === "reminder" && job.bookingId) {
        const bk = await prisma.booking.findUnique({ where: { id: job.bookingId }, select: { status: true, startAt: true } });
        const intended = (payload.data as any)?.intendedStartISO;
        if (!bk || bk.status !== "CONFIRMED" || (intended && bk.startAt.toISOString() !== intended)) {
          await prisma.notificationOutbox.update({ where: { id: job.id }, data: { status: "SKIPPED", processedAt: new Date(), error: "booking changed/cancelled" } });
          skipped++;
          continue;
        }
      }

      if (!job.customerId) {
        await prisma.notificationOutbox.update({ where: { id: job.id }, data: { status: "SKIPPED", processedAt: new Date() } });
        skipped++;
        continue;
      }

      const result = await sendPushToCustomer(job.customerId, { title: payload.title, body: payload.body, data: payload.data });
      if (!result.configuredDevices) {
        // Καμία συσκευή push — το inbox έχει ήδη την ειδοποίηση.
        await prisma.notificationOutbox.update({ where: { id: job.id }, data: { status: "SKIPPED", processedAt: new Date(), error: "no_device" } });
        skipped++;
      } else {
        await prisma.notificationOutbox.update({ where: { id: job.id }, data: { status: "SENT", processedAt: new Date(), error: null } });
        sent++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (job.attempts >= MAX_ATTEMPTS) {
        await prisma.notificationOutbox.update({ where: { id: job.id }, data: { status: "FAILED", processedAt: new Date(), error: msg.slice(0, 300) } });
        failed++;
      } else {
        // retry με backoff
        await prisma.notificationOutbox.update({
          where: { id: job.id },
          data: { status: "PENDING", scheduledAt: new Date(Date.now() + backoffSeconds(job.attempts) * 1000), error: msg.slice(0, 300) },
        });
      }
    }
  }
  return { sent, skipped, failed };
}

export async function runWorker(): Promise<{ expiredOffers: number; reminders: number; sent: number; skipped: number; failed: number }> {
  const o = await expireOffers();
  const r = await scanReminders();
  const p = await processOutbox();
  // Συγχρονισμός Instagram με throttle (κάθε ~6 ώρες) — δεν μπλοκάρει τον worker.
  await maybeSyncInstagram().catch(() => {});
  return { expiredOffers: o.expired, reminders: r.enqueued, ...p };
}
