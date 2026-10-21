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

// --- Ελληνικές αργίες (ίδια λογική με src/lib — αυτόνομο για το boot) ---
function tzOffsetMinutes(instant) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Athens", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const m = {};
  for (const p of dtf.formatToParts(instant)) if (p.type !== "literal") m[p.type] = Number(p.value);
  const hour = m.hour === 24 ? 0 : m.hour;
  return (Date.UTC(m.year, m.month - 1, m.day, hour, m.minute, m.second) - instant.getTime()) / 60000;
}
function athensWallToUtc(dateStr, timeStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const o1 = tzOffsetMinutes(new Date(guess));
  let utc = guess - o1 * 60000;
  const o2 = tzOffsetMinutes(new Date(utc));
  if (o2 !== o1) utc = guess - o2 * 60000;
  return new Date(utc);
}
function toDateStr(dt) {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
function addDaysStr(dateStr, n) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return toDateStr(dt);
}
function orthodoxEaster(year) {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + 13);
  return toDateStr(dt);
}
function greekHolidays(year) {
  const easter = orthodoxEaster(year);
  return [
    { date: `${year}-01-01`, name: "Πρωτοχρονιά" },
    { date: `${year}-01-06`, name: "Θεοφάνεια" },
    { date: addDaysStr(easter, -48), name: "Καθαρά Δευτέρα" },
    { date: `${year}-03-25`, name: "Ευαγγελισμός / 25η Μαρτίου" },
    { date: addDaysStr(easter, -2), name: "Μεγάλη Παρασκευή" },
    { date: addDaysStr(easter, 1), name: "Δευτέρα του Πάσχα" },
    { date: `${year}-05-01`, name: "Εργατική Πρωτομαγιά" },
    { date: addDaysStr(easter, 50), name: "Αγίου Πνεύματος" },
    { date: `${year}-08-15`, name: "Κοίμηση της Θεοτόκου" },
    { date: `${year}-10-28`, name: "Επέτειος του «Όχι»" },
    { date: `${year}-12-25`, name: "Χριστούγεννα" },
    { date: `${year}-12-26`, name: "Δεύτερη ημέρα Χριστουγέννων" },
  ];
}
async function seedHolidays() {
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens", year: "numeric" }).format(new Date()));
  for (const y of [year, year + 1]) {
    const ys = athensWallToUtc(`${y}-01-01`, "00:00");
    const ye = athensWallToUtc(`${y + 1}-01-01`, "00:00");
    const existing = await prisma.closure.findMany({
      where: { barberId: null, startAt: { gte: ys, lt: ye } },
      select: { startAt: true, endAt: true },
    });
    const covers = (ds) => {
      const s = athensWallToUtc(ds, "00:00");
      const e = athensWallToUtc(addDaysStr(ds, 1), "00:00");
      return existing.some((c) => c.startAt <= s && c.endAt >= e);
    };
    const toCreate = greekHolidays(y)
      .filter((h) => !covers(h.date))
      .map((h) => ({
        barberId: null,
        startAt: athensWallToUtc(h.date, "00:00"),
        endAt: athensWallToUtc(addDaysStr(h.date, 1), "00:00"),
        reason: `Αργία: ${h.name}`,
      }));
    if (toCreate.length) await prisma.closure.createMany({ data: toCreate });
  }
}

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

  // Ελληνικές αργίες (τρέχον + επόμενο έτος) — idempotent.
  await seedHolidays();

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
