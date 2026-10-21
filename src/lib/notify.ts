/**
 * Ειδοποιήσεις πελάτη (server-only).
 * --------------------------------------------------------------------------
 * Προς το παρόν: SMS ακύρωσης όταν ακυρώνει ο ιδιοκτήτης από το /admin.
 * - Καταγράφει κάθε προσπάθεια στο NotificationLog (sent / failed / skipped).
 * - Dedupe: δεν ξαναστέλνει αν υπάρχει ήδη επιτυχημένο SMS ακύρωσης.
 * - Χωρίς πάροχο: καταγράφει "skipped_no_provider" (κανένα ψεύτικο μήνυμα).
 */
import { prisma } from "@/lib/db";
import { sendSms, toE164 } from "@/lib/sms";
import { athensParts, formatAthensDateLong, formatAthensTime } from "@/lib/datetime";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function notifyCancellationSms(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || !booking.customerPhone) return;

  // Dedupe: αν έχει ήδη σταλεί επιτυχώς, σταμάτα.
  const already = await prisma.notificationLog.findFirst({
    where: { bookingId, type: "cancellation", channel: "sms", status: "sent" },
  });
  if (already) return;

  const dateStr = athensParts(booking.startAt).dateStr;
  const body =
    `ΤΟ ΚΟΥΡΕΙΟΝ 27: Το ραντεβού σας (${booking.serviceName}) ` +
    `${formatAthensDateLong(dateStr)} στις ${formatAthensTime(booking.startAt)} ακυρώθηκε. ` +
    `Για νέο ραντεβού: ${SITE_URL}/booking`;

  const to = toE164(booking.customerPhone);
  const result = await sendSms(to, body);

  await prisma.notificationLog.create({
    data: {
      bookingId,
      channel: "sms",
      type: "cancellation",
      to,
      status: result.ok ? "sent" : result.reason === "not_configured" ? "skipped_no_provider" : "failed",
      error: result.ok ? null : result.reason === "error" ? (result.error ?? "error") : null,
    },
  });
}
