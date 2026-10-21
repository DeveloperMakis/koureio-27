/**
 * Βοηθήματα ημερομηνίας/ώρας με σωστό χειρισμό ζώνης Europe/Athens και DST.
 * --------------------------------------------------------------------------
 * Οι ώρες ραντεβού αποθηκεύονται ως UTC `DateTime` στη βάση. Ο υπολογισμός
 * διαθεσιμότητας γίνεται σε τοπική ώρα Αθήνας. Δεν χρησιμοποιούμε εξωτερική
 * βιβλιοθήκη — μόνο το Intl API, ώστε ο κώδικας να είναι ανεξάρτητος από τη
 * ζώνη ώρας του server.
 */

export const TZ = "Europe/Athens";

const WEEKDAYS_EL = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
const MONTHS_EL = [
  "Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου",
  "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου",
];

/** Offset (λεπτά) της ζώνης `tz` για τη δεδομένη χρονική στιγμή. */
function tzOffsetMinutes(instant: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value);
  // 24:00 → 00:00 normalisation κάποιων μηχανών
  const hour = map.hour === 24 ? 0 : map.hour;
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  return (asUTC - instant.getTime()) / 60000;
}

/**
 * Μετατρέπει τοπική ώρα τοίχου Αθήνας (ημ/νία + "HH:mm") σε στιγμή UTC,
 * λαμβάνοντας υπόψη τη θερινή/χειμερινή ώρα.
 */
export function athensWallToUtc(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi);
  const off1 = tzOffsetMinutes(new Date(utcGuess), TZ);
  let utc = utcGuess - off1 * 60000;
  const off2 = tzOffsetMinutes(new Date(utc), TZ);
  if (off2 !== off1) utc = utcGuess - off2 * 60000;
  return new Date(utc);
}

/** Τα μέρη (έτος/μήνας/ημέρα/ώρα/λεπτό/ημέρα εβδομάδας) μιας στιγμής σε ώρα Αθήνας. */
export function athensParts(instant: Date): {
  year: number; month: number; day: number; hour: number; minute: number; weekday: number; dateStr: string;
} {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour12: false, weekday: "short",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = map.hour === "24" ? 0 : Number(map.hour);
  const minute = Number(map.minute);
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { year, month, day, hour, minute, weekday: weekdayMap[map.weekday] ?? 0, dateStr };
}

/** Τρέχουσα ημ/νία Αθήνας ως "YYYY-MM-DD". */
export function todayAthens(): string {
  return athensParts(new Date()).dateStr;
}

/** Ημέρα εβδομάδας (0=Κυρ) για "YYYY-MM-DD" στην ώρα Αθήνας (μεσημέρι ως ασφαλές σημείο). */
export function weekdayOf(dateStr: string): number {
  const noon = athensWallToUtc(dateStr, "12:00");
  return athensParts(noon).weekday;
}

/** Προσθήκη ημερών σε "YYYY-MM-DD" (ημερολογιακά, ασφαλές ως προς DST). */
export function addDays(dateStr: string, n: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** "HH:mm" → λεπτά από τα μεσάνυχτα. */
export function hmToMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/** Λεπτά → "HH:mm". */
export function minToHm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Μορφοποίηση ώρας Αθήνας "HH:mm" από στιγμή UTC. */
export function formatAthensTime(instant: Date): string {
  const p = athensParts(instant);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** Μεγάλη ελληνική μορφή ημερομηνίας, π.χ. «Τρίτη 21 Οκτωβρίου 2025». */
export function formatAthensDateLong(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const wd = weekdayOf(dateStr);
  return `${WEEKDAYS_EL[wd]} ${d} ${MONTHS_EL[mo - 1]} ${y}`;
}

/** Σύντομη ελληνική ημερομηνία, π.χ. «Τρί 21/10». */
export function formatAthensDateShort(dateStr: string): string {
  const [, mo, d] = dateStr.split("-").map(Number);
  const wd = weekdayOf(dateStr);
  return `${WEEKDAYS_EL[wd].slice(0, 3)} ${d}/${mo}`;
}

export { WEEKDAYS_EL, MONTHS_EL };
