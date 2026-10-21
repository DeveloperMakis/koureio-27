/**
 * Αποστολή push μέσω Expo Push API.
 * --------------------------------------------------------------------------
 * - Στέλνει σε ΟΛΕΣ τις ενεργές συσκευές του πελάτη (multi-device).
 * - Καθαρίζει (disable) tokens που το Expo αναφέρει ως DeviceNotRegistered.
 * - «ok» ticket = ο πάροχος ΑΠΟΔΕΧΤΗΚΕ την αποστολή (όχι «παραδόθηκε»). Η
 *   επιβεβαίωση παράδοσης γίνεται με receipts (βλ. σημείωση) — ΔΕΝ ισχυριζόμαστε
 *   παράδοση μόνο επειδή έγινε αποδεκτό.
 */
import { prisma } from "@/lib/db";

const EXPO_URL = "https://exp.host/--/api/v2/push/send";

export interface PushResult {
  configuredDevices: boolean;
  accepted: number;
  failed: number;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

export async function sendPushToCustomer(
  customerId: string,
  msg: { title: string; body: string; data?: Record<string, unknown> },
): Promise<PushResult> {
  const devices = await prisma.deviceRegistration.findMany({
    where: { customerId, disabledAt: null },
    select: { id: true, expoPushToken: true },
  });
  if (devices.length === 0) return { configuredDevices: false, accepted: 0, failed: 0 };

  const messages = devices.map((d) => ({
    to: d.expoPushToken,
    title: msg.title,
    body: msg.body,
    data: msg.data ?? {},
    sound: "default",
    priority: "high",
    channelId: "default",
  }));

  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.EXPO_ACCESS_TOKEN) headers["Authorization"] = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  const res = await fetch(EXPO_URL, { method: "POST", headers, body: JSON.stringify(messages) });
  if (!res.ok) {
    throw new Error(`Expo push HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: ExpoTicket[] };
  const tickets = json.data ?? [];

  let accepted = 0;
  let failed = 0;
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    if (t.status === "ok") {
      accepted++;
    } else {
      failed++;
      if (t.details?.error === "DeviceNotRegistered") {
        await prisma.deviceRegistration.update({ where: { id: devices[i].id }, data: { disabledAt: new Date() } }).catch(() => {});
      }
    }
  }
  if (accepted === 0 && failed > 0) throw new Error(`Όλα τα push απέτυχαν (${failed})`);
  return { configuredDevices: true, accepted, failed };
}
