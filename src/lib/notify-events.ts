/**
 * Δημιουργία ειδοποίησης: γράφει ΤΑΥΤΟΧΡΟΝΑ inbox (InAppNotification) + job push
 * (NotificationOutbox). Το inbox λειτουργεί ακόμη κι αν δεν υπάρχει/επιτραπεί push.
 * Idempotent μέσω `dedupeKey` (unique στο outbox). Μπορεί να κληθεί μέσα σε
 * transaction (transactional outbox) ή standalone.
 */
import { prisma } from "@/lib/db";

type NotifClient = {
  inAppNotification: typeof prisma.inAppNotification;
  notificationOutbox: typeof prisma.notificationOutbox;
};

export async function enqueueNotification(
  client: NotifClient,
  p: {
    customerId: string;
    type: string;
    title: string;
    body: string;
    dedupeKey: string;
    data?: Record<string, unknown>;
    bookingId?: string | null;
    scheduledAt?: Date;
  },
): Promise<void> {
  // Dedupe: αν υπάρχει ήδη job με το ίδιο κλειδί, μην ξαναγράψεις (ούτε inbox).
  const existing = await client.notificationOutbox.findUnique({ where: { dedupeKey: p.dedupeKey } });
  if (existing) return;

  await client.inAppNotification.create({
    data: {
      customerId: p.customerId,
      type: p.type,
      title: p.title,
      body: p.body,
      bookingId: p.bookingId ?? null,
      data: p.data ? JSON.stringify(p.data) : null,
    },
  });

  await client.notificationOutbox.create({
    data: {
      customerId: p.customerId,
      bookingId: p.bookingId ?? null,
      type: p.type,
      channels: "push",
      dedupeKey: p.dedupeKey,
      payload: JSON.stringify({ title: p.title, body: p.body, data: p.data ?? {} }),
      scheduledAt: p.scheduledAt ?? new Date(),
    },
  });
}
