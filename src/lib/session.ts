import type { SessionOptions } from "iron-session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  adminId?: string;
  email?: string;
}

const secret = process.env.SESSION_SECRET;

export const sessionOptions: SessionOptions = {
  password: secret ?? "dev-only-insecure-secret-change-me-32+chars",
  cookieName: "k27_admin",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 ώρες
  },
};

export async function getSession() {
  if (!secret || secret.length < 32) {
    // Σαφές μήνυμα αντί για σιωπηλή αποτυχία ασφάλειας.
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET λείπει ή είναι πολύ μικρό (απαιτούνται 32+ χαρακτήρες).");
    }
  }
  return getIronSession<SessionData>(cookies(), sessionOptions);
}
