/**
 * Αρχικό setup παραγωγής (τρέχει στο boot του container, idempotent).
 * Αυτόνομο — χρησιμοποιεί μόνο @prisma/client (+ bcryptjs για admin).
 * - Καταχωρεί τον κατάλογο υπηρεσιών ΑΝΕΝΕΡΓΟ & χωρίς τιμές (ο ιδιοκτήτης τα ορίζει).
 * - Δημιουργεί έναν κουρέα + εβδομαδιαίο ωράριο (επαληθευμένο), αν δεν υπάρχει.
 * - Δημιουργεί/ενημερώνει admin αν δοθούν ADMIN_EMAIL & ADMIN_PASSWORD.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const services = [
  { slug: "androiko-kourema", name: "Ανδρικό κούρεμα", description: "Κλασικό ή μοντέρνο κούρεμα, προσαρμοσμένο στο στυλ σου.", durationMin: 30, order: 1 },
  { slug: "fade", name: "Fade / Skin fade", description: "Καθαρές, σταδιακές μεταβάσεις με προσοχή στη λεπτομέρεια.", durationMin: 40, order: 2 },
  { slug: "genia", name: "Περιποίηση γενειάδας", description: "Σχηματισμός, τριμάρισμα και περιποίηση γενειάδας.", durationMin: 20, order: 3 },
  { slug: "kourema-genia", name: "Κούρεμα & γενειάδα", description: "Ολοκληρωμένη περιποίηση σε ένα ραντεβού.", durationMin: 50, order: 4 },
  { slug: "paradosiako-xyrisma", name: "Παραδοσιακό ξύρισμα", description: "Ξύρισμα με ξυράφι και ζεστή πετσέτα.", durationMin: 30, order: 5 },
  { slug: "paidiko-kourema", name: "Παιδικό κούρεμα", description: "Κούρεμα για τους μικρούς μας πελάτες.", durationMin: 30, order: 6 },
  { slug: "lousimo-styling", name: "Λούσιμο & styling", description: "Λούσιμο και φινίρισμα styling.", durationMin: 20, order: 7 },
];

// Ωράριο (Google Maps, Οκτ. 2025). 0=Κυρ … 6=Σαβ.
const hours = {
  2: [["10:00", "20:30"]],
  3: [["11:00", "17:00"]],
  4: [["10:00", "20:30"]],
  5: [["10:00", "20:30"]],
  6: [["10:00", "17:00"]],
};

async function main() {
  for (const s of services) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: { name: s.name, description: s.description, order: s.order },
      create: { slug: s.slug, name: s.name, description: s.description, durationMin: s.durationMin, priceCents: null, active: false, order: s.order },
    });
  }

  let barber = await prisma.barber.findFirst({ orderBy: { order: "asc" } });
  if (!barber) {
    barber = await prisma.barber.create({ data: { name: "Γιώργος", active: true, order: 1 } });
    for (const [day, intervals] of Object.entries(hours)) {
      for (const [open, close] of intervals) {
        await prisma.barberSchedule.create({ data: { barberId: barber.id, dayOfWeek: Number(day), open, close } });
      }
    }
  }

  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (email && password.length >= 8) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.admin.upsert({ where: { email }, update: { passwordHash }, create: { email, passwordHash } });
    console.log("✔ Admin έτοιμος:", email);
  }

  console.log("✔ Prod setup ολοκληρώθηκε.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(0); // μην μπλοκάρει την εκκίνηση
  })
  .finally(() => prisma.$disconnect());
