/**
 * ΕΠΙΒΕΒΑΙΩΣΗ ΤΗΛΕΦΩΝΟΥ ΜΕ SMS (OTP) — ήπιος έλεγχος κατά άσκοπων/ψεύτικων κρατήσεων.
 * --------------------------------------------------------------------------
 * Λογική (ήπιο): παλιοί πελάτες (με προηγούμενο ραντεβού) → καμία τριβή.
 * Νέα/άγνωστα τηλέφωνα → κωδικός SMS, ΜΟΝΟ αν (α) υπάρχει πάροχος SMS και
 * (β) ο έλεγχος είναι ενεργός από το admin. Αλλιώς επιτρέπονται κανονικά.
 * Ο κωδικός αποθηκεύεται ΜΟΝΟ ως hash.
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendSms, toE164 } from "@/lib/sms";
import { business } from "@/config/business";

const OTP_TTL_MIN = 10;
const VERIFY_TTL_MIN = 20;
const MAX_ATTEMPTS = 5;

export function normalizePhone(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

/** Εθνικό 10ψήφιο (ταύτιση πελάτη ανεξαρτήτως +30/κενών). */
export function nationalKey(raw: string): string {
  const d = normalizePhone(raw);
  return d.length > 10 ? d.slice(-10) : d;
}

export function smsConfigured(): boolean {
  return !!process.env.SMS_PROVIDER;
}

export async function otpEnabled(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { key: "otp_enabled" } });
  return row?.value === "true";
}

export async function setOtpEnabled(on: boolean): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: "otp_enabled" },
    update: { value: on ? "true" : "false" },
    create: { key: "otp_enabled", value: on ? "true" : "false" },
  });
}

/** Υπάρχων πελάτης = έχει προηγούμενο ενεργό/ολοκληρωμένο ραντεβού με το τηλέφωνο. */
export async function isKnownCustomer(phone: string): Promise<boolean> {
  const key = nationalKey(phone);
  if (key.length < 6) return false;
  const count = await prisma.booking.count({
    where: { customerPhone: { contains: key }, status: { in: ["CONFIRMED", "COMPLETED"] } },
  });
  return count > 0;
}

/** Χρειάζεται OTP αυτό το τηλέφωνο; (ήπιος έλεγχος) */
export async function otpRequired(phone: string): Promise<boolean> {
  if (!smsConfigured()) return false; // χωρίς SMS → ποτέ (ήπιο)
  if (!(await otpEnabled())) return false; // κλειστό από admin
  return !(await isKnownCustomer(phone)); // μόνο νέα τηλέφωνα
}

export async function hasRecentVerification(phone: string): Promise<boolean> {
  const key = nationalKey(phone);
  const since = new Date(Date.now() - VERIFY_TTL_MIN * 60000);
  const row = await prisma.otpChallenge.findFirst({
    where: { phone: key, verifiedAt: { gte: since } },
    orderBy: { verifiedAt: "desc" },
  });
  return !!row;
}

export async function sendOtp(phone: string): Promise<{ ok: boolean; reason?: string }> {
  const key = nationalKey(phone);
  if (key.length < 10) return { ok: false, reason: "invalid_phone" };
  // Rate limit: έως 3 κωδικοί ανά 10 λεπτά ανά τηλέφωνο.
  const since = new Date(Date.now() - 10 * 60000);
  const recent = await prisma.otpChallenge.count({ where: { phone: key, createdAt: { gte: since } } });
  if (recent >= 3) return { ok: false, reason: "rate_limited" };

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6ψήφιος
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.otpChallenge.create({
    data: { phone: key, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60000) },
  });
  const res = await sendSms(toE164(phone), `${business.name}: κωδικός επιβεβαίωσης ${code} (λήγει σε ${OTP_TTL_MIN}΄).`);
  if (!res.ok) return { ok: false, reason: res.reason };
  return { ok: true };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const key = nationalKey(phone);
  const now = new Date();
  const ch = await prisma.otpChallenge.findFirst({
    where: { phone: key, verifiedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (!ch || ch.attempts >= MAX_ATTEMPTS) return false;
  const ok = await bcrypt.compare((code || "").trim(), ch.codeHash);
  if (!ok) {
    await prisma.otpChallenge.update({ where: { id: ch.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await prisma.otpChallenge.update({ where: { id: ch.id }, data: { verifiedAt: now } });
  return true;
}
