/**
 * Seed: καταχωρεί τον κατάλογο υπηρεσιών (ΑΝΕΝΕΡΓΕΣ, χωρίς τιμές), έναν κουρέα
 * και το εβδομαδιαίο του ωράριο από τα επαληθευμένα στοιχεία της επιχείρησης.
 *
 * ΔΕΝ ενεργοποιεί υπηρεσίες και ΔΕΝ ορίζει τιμές — αυτά τα κάνει ο ιδιοκτήτης
 * από το /admin, ώστε να μην δημοσιευτεί τίποτα μη επιβεβαιωμένο.
 */
import { PrismaClient } from "@prisma/client";
import { serviceCatalog } from "../src/config/services";
import { business } from "../src/config/business";

const prisma = new PrismaClient();

async function main() {
  // --- Υπηρεσίες ---
  for (const s of serviceCatalog) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        description: s.description,
        // Σε ενημέρωση ΔΕΝ πατάμε active/price/duration — τα διαχειρίζεται ο ιδιοκτήτης.
        order: s.order,
      },
      create: {
        slug: s.slug,
        name: s.name,
        description: s.description,
        durationMin: s.durationMin,
        priceCents: s.priceCents,
        active: s.active,
        order: s.order,
      },
    });
  }
  console.log(`✔ Υπηρεσίες: ${serviceCatalog.length} καταχωρήθηκαν (ανενεργές ως προεπιλογή).`);

  // --- Κουρέας (ένας) ---
  // Όνομα από δημόσιες αναφορές· χρησιμοποιείται εσωτερικά/στο admin. Μπορείτε
  // να το αλλάξετε. Σε λειτουργία ενός κουρέα ΔΕΝ εμφανίζεται όνομα δημόσια.
  let barber = await prisma.barber.findFirst({ orderBy: { order: "asc" } });
  if (!barber) {
    barber = await prisma.barber.create({
      data: { name: "Γιώργος", active: true, order: 1 },
    });
    console.log("✔ Κουρέας: δημιουργήθηκε.");
  } else {
    console.log("• Κουρέας: υπάρχει ήδη, παραλείπεται.");
  }

  // --- Εβδομαδιαίο ωράριο κουρέα από το ωράριο καταστήματος ---
  const existingSchedules = await prisma.barberSchedule.count({ where: { barberId: barber.id } });
  if (existingSchedules === 0) {
    let count = 0;
    for (const [dayStr, intervals] of Object.entries(business.hours)) {
      const day = Number(dayStr);
      for (const iv of intervals) {
        await prisma.barberSchedule.create({
          data: { barberId: barber.id, dayOfWeek: day, open: iv.open, close: iv.close },
        });
        count++;
      }
    }
    console.log(`✔ Ωράριο κουρέα: ${count} διαστήματα από το ωράριο καταστήματος.`);
  } else {
    console.log("• Ωράριο κουρέα: υπάρχει ήδη, παραλείπεται.");
  }

  console.log("\nΈτοιμο. Οι δημόσιες κρατήσεις θα ενεργοποιηθούν μόλις ο ιδιοκτήτης");
  console.log("ενεργοποιήσει τουλάχιστον μία υπηρεσία από το /admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
