import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Επιστρέφει το adminId της τρέχουσας συνεδρίας ή null. */
export async function getCurrentAdminId(): Promise<string | null> {
  const session = await getSession();
  if (!session.adminId) return null;
  // Επιβεβαίωση ότι ο admin υπάρχει ακόμη.
  const admin = await prisma.admin.findUnique({ where: { id: session.adminId }, select: { id: true } });
  return admin?.id ?? null;
}

/** Για χρήση σε server components/route handlers — πετά αν δεν είναι συνδεδεμένος. */
export async function requireAdmin(): Promise<string> {
  const id = await getCurrentAdminId();
  if (!id) throw new Error("UNAUTHORIZED");
  return id;
}
