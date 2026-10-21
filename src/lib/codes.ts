import { randomBytes } from "crypto";

// Αλφάβητο χωρίς ασαφείς χαρακτήρες (0/O, 1/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Ανθρώπινος κωδικός κράτησης, π.χ. "K27-7F3QAB". */
export function generateBookingCode(): string {
  const bytes = randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `K27-${s}`;
}

/** Μυστικό token για ασφαλή σύνδεσμο αλλαγής/ακύρωσης. */
export function generateCancelToken(): string {
  return randomBytes(24).toString("base64url");
}
