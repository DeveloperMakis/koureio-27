/**
 * Authentication πελατών εφαρμογής (server-only).
 * --------------------------------------------------------------------------
 * - Password hashing με bcrypt.
 * - Access token: σύντομης διάρκειας, υπογεγραμμένο (HMAC-SHA256), stateless.
 * - Refresh token: τυχαίο, αποθηκεύεται ΜΟΝΟ ως hash στο MobileSession,
 *   ανακλητό (logout), με rotation σε κάθε refresh.
 * Μυστικά αποκλειστικά server-side (env).
 */
import { createHmac, randomBytes, createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const SECRET = process.env.MOBILE_JWT_SECRET || process.env.SESSION_SECRET || "dev-only-insecure-mobile-secret-change";
const ACCESS_TTL_MS = 15 * 60 * 1000; // 15 λεπτά
const REFRESH_TTL_MS = 60 * 24 * 3600 * 1000; // 60 ημέρες

export const ACCESS_TTL_SECONDS = Math.floor(ACCESS_TTL_MS / 1000);

function b64url(s: string | Buffer): string {
  return Buffer.from(s).toString("base64url");
}
function hmac(input: string): string {
  return createHmac("sha256", SECRET).update(input).digest("base64url");
}
function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Υπογεγραμμένο access token {sub, exp}. */
export function signAccessToken(customerId: string): string {
  const payload = b64url(JSON.stringify({ sub: customerId, exp: Date.now() + ACCESS_TTL_MS }));
  return `${payload}.${hmac(payload)}`;
}

export function verifyAccessToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!safeEqual(hmac(payload), sig)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || Date.now() > data.exp) return null;
    return typeof data.sub === "string" ? data.sub : null;
  } catch {
    return null;
  }
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
}

/** Δημιουργεί νέο session + ζεύγος tokens. */
export async function createSession(customerId: string, userAgent?: string): Promise<TokenPair> {
  const refreshToken = randomBytes(32).toString("base64url");
  await prisma.mobileSession.create({
    data: {
      customerId,
      refreshTokenHash: sha256(refreshToken),
      userAgent: userAgent?.slice(0, 200) ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  return { accessToken: signAccessToken(customerId), refreshToken, accessExpiresIn: ACCESS_TTL_SECONDS };
}

/** Rotation: επαληθεύει refresh, εκδίδει νέο ζεύγος, ακυρώνει το παλιό. */
export async function rotateSession(refreshToken: string, userAgent?: string): Promise<TokenPair | null> {
  const hash = sha256(refreshToken);
  const session = await prisma.mobileSession.findUnique({ where: { refreshTokenHash: hash } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

  const newRefresh = randomBytes(32).toString("base64url");
  await prisma.mobileSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: sha256(newRefresh),
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent: userAgent?.slice(0, 200) ?? session.userAgent,
    },
  });
  return { accessToken: signAccessToken(session.customerId), refreshToken: newRefresh, accessExpiresIn: ACCESS_TTL_SECONDS };
}

export async function revokeSession(refreshToken: string): Promise<void> {
  const hash = sha256(refreshToken);
  await prisma.mobileSession
    .updateMany({ where: { refreshTokenHash: hash, revokedAt: null }, data: { revokedAt: new Date() } })
    .catch(() => {});
}

/** Από Authorization: Bearer <access> → customerId (ή null). Ελέγχει ύπαρξη πελάτη. */
export async function customerFromRequest(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const customerId = verifyAccessToken(m[1]);
  if (!customerId) return null;
  const exists = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  return exists?.id ?? null;
}
