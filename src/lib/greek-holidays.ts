/**
 * ΕΛΛΗΝΙΚΕΣ ΑΡΓΙΕΣ (επίσημες — δημόσιες)
 * --------------------------------------------------------------------------
 * Επιστρέφει τις επίσημες αργίες ενός έτους (σταθερές + κινητές με βάση το
 * Ορθόδοξο Πάσχα). Χρησιμοποιείται για να «κλείνουν» αυτόματα οι μέρες στο
 * σύστημα κρατήσεων. Ο ιδιοκτήτης μπορεί να προσθέσει/αφαιρέσει μέσα από το
 * admin (κάθε αργία γίνεται ένα ολοήμερο «κλείσιμο»).
 *
 * Σημ.: Η Κυριακή του Πάσχα δεν περιλαμβάνεται ξεχωριστά (οι Κυριακές είναι
 * ούτως ή άλλως κλειστές), αλλά μπορεί να προστεθεί αν χρειαστεί.
 */

export interface GreekHoliday {
  date: string; // "YYYY-MM-DD" (ημερολογιακή ημερομηνία)
  name: string;
}

/** Ορθόδοξο Πάσχα (Γρηγοριανή ημερομηνία) για το έτος — αλγόριθμος Meeus/Ιουλιανό +13. */
export function orthodoxEaster(year: number): string {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3=Μάρτιος, 4=Απρίλιος (Ιουλιανό)
  const day = ((d + e + 114) % 31) + 1;
  // Ιουλιανή → Γρηγοριανή: +13 ημέρες (ισχύει 1900–2099).
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + 13);
  return toDateStr(dt);
}

function toDateStr(dt: Date): string {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function shift(dateStr: string, days: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toDateStr(dt);
}

/** Όλες οι επίσημες ελληνικές αργίες του έτους, ταξινομημένες. */
export function greekHolidays(year: number): GreekHoliday[] {
  const easter = orthodoxEaster(year);
  const list: GreekHoliday[] = [
    { date: `${year}-01-01`, name: "Πρωτοχρονιά" },
    { date: `${year}-01-06`, name: "Θεοφάνεια" },
    { date: shift(easter, -48), name: "Καθαρά Δευτέρα" },
    { date: `${year}-03-25`, name: "Ευαγγελισμός / 25η Μαρτίου" },
    { date: shift(easter, -2), name: "Μεγάλη Παρασκευή" },
    { date: shift(easter, 1), name: "Δευτέρα του Πάσχα" },
    { date: `${year}-05-01`, name: "Εργατική Πρωτομαγιά" },
    { date: shift(easter, 50), name: "Αγίου Πνεύματος" },
    { date: `${year}-08-15`, name: "Κοίμηση της Θεοτόκου" },
    { date: `${year}-10-28`, name: "Επέτειος του «Όχι»" },
    { date: `${year}-12-25`, name: "Χριστούγεννα" },
    { date: `${year}-12-26`, name: "Δεύτερη ημέρα Χριστουγέννων" },
  ];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
