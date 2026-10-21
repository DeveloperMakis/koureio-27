/**
 * Δημιουργία/ενημέρωση πρώτου διαχειριστή.
 *
 * Χρήση:
 *   npm run create-admin -- admin@example.gr "ΙσχυρόςΚωδικός#2025"
 * ή με μεταβλητές περιβάλλοντος:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || "";

  if (!email || !password) {
    console.error("Χρήση: npm run create-admin -- <email> <password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
  console.log(`✔ Διαχειριστής έτοιμος: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
