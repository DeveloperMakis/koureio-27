/**
 * ΣΤΟΙΧΕΙΑ ΕΠΙΧΕΙΡΗΣΗΣ — ΤΟ ΚΟΥΡΕΙΟΝ 27
 * --------------------------------------------------------------------------
 * Μοναδικό σημείο αλήθειας για τα δημόσια στοιχεία επικοινωνίας.
 * Τα παρακάτω έχουν επαληθευτεί από Google Maps + το επίσημο Instagram
 * (@to_koureion_27) τον Οκτώβριο 2025. Ελέγξτε ξανά πριν τη δημοσίευση.
 *
 * ΟΤΙ ΔΕΝ ΕΙΝΑΙ ΕΠΙΒΕΒΑΙΩΜΕΝΟ μένει κενό (null / []) — ΔΕΝ εφευρίσκουμε
 * τιμές, βραβεία, χρόνια λειτουργίας ή ονόματα.
 */

export type DayHours = { open: string; close: string }[]; // 24h "HH:mm", άδειο = κλειστά

export interface BusinessInfo {
  name: string;
  shortName: string;
  category: string;
  area: string;
  timezone: string;

  address: {
    street: string;
    city: string;
    postalCode: string;
    full: string;
    plusCode: string | null;
  };

  geo: { lat: number; lng: number } | null;

  phones: {
    label: string;
    display: string;
    tel: string; // E.164, για tel: links
    primary?: boolean;
  }[];

  email: string | null;

  social: {
    instagram: string | null;
    facebook: string | null;
  };

  maps: {
    placeUrl: string;
    directionsUrl: string;
    embedQuery: string; // χρησιμοποιείται για τον χάρτη που φορτώνει κατόπιν ενέργειας
  };

  /**
   * Εβδομαδιαίο ωράριο με δείκτη ημέρας JS (0=Κυριακή ... 6=Σάββατο).
   * Επαληθευμένο από Google Maps.
   */
  hours: Record<number, DayHours>;

  /**
   * Εξαιρέσεις / αργίες: πλήρως κλειστά ή ειδικό ωράριο σε συγκεκριμένη ημ/νία.
   * Μορφή ημ/νίας: "YYYY-MM-DD" (τοπική ώρα Αθήνας). Συμπληρώνει ο ιδιοκτήτης.
   */
  holidays: { date: string; closed: boolean; note?: string; hours?: DayHours }[];
}

export const business: BusinessInfo = {
  name: "ΤΟ ΚΟΥΡΕΙΟΝ 27",
  shortName: "ΚΟΥΡΕΙΟΝ 27",
  category: "Κουρείο — Barber Shop",
  area: "Κορυδαλλός",
  timezone: "Europe/Athens",

  address: {
    street: "Χειμάρρας 22",
    city: "Κορυδαλλός",
    postalCode: "181 22",
    full: "Χειμάρρας 22, Κορυδαλλός 181 22",
    plusCode: "XJPX+2P Κορυδαλλός",
  },

  geo: { lat: 37.9851185, lng: 23.6492749 },

  phones: [
    { label: "Σταθερό", display: "216 809 9380", tel: "+302168099380", primary: true },
    { label: "Κινητό", display: "698 006 6177", tel: "+306980066177" },
  ],

  // Δεν εμφανίζεται δημόσιο email στις πηγές. Συμπληρώστε αν υπάρχει.
  email: null,

  social: {
    instagram: "https://www.instagram.com/to_koureion_27/",
    facebook: null,
  },

  maps: {
    placeUrl:
      "https://www.google.com/maps/place/%CE%A4%CE%9F+%CE%9A%CE%9F%CE%A5%CE%A1%CE%95%CE%99%CE%9F%CE%9D+27/@37.9851185,23.6492749,17z/data=!3m1!4b1!4m6!3m5!1s0x14a1bba5e4c1d40d:0x9421aa3921bf89c!8m2!3d37.9851185!4d23.6492749!16s%2Fg%2F11y0q6h914",
    directionsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=37.9851185,23.6492749&destination_place_id=ChIJDdTB5KW7oRQRnLgbkqNBIZQ",
    embedQuery: "ΤΟ ΚΟΥΡΕΙΟΝ 27, Χειμάρρας 22, Κορυδαλλός",
  },

  // Επαληθευμένο ωράριο (Google Maps, Οκτ. 2025). Europe/Athens.
  hours: {
    0: [], // Κυριακή — κλειστά
    1: [], // Δευτέρα — κλειστά
    2: [{ open: "10:00", close: "20:30" }], // Τρίτη
    3: [{ open: "11:00", close: "17:00" }], // Τετάρτη
    4: [{ open: "10:00", close: "20:30" }], // Πέμπτη
    5: [{ open: "10:00", close: "20:30" }], // Παρασκευή
    6: [{ open: "10:00", close: "17:00" }], // Σάββατο
  },

  holidays: [
    // Παράδειγμα (απενεργοποιημένο σχόλιο):
    // { date: "2025-12-25", closed: true, note: "Χριστούγεννα" },
  ],
};

/** Υπάρχει επαρκώς συμπληρωμένο ωράριο ώστε να δείχνουμε «Ανοιχτά τώρα»; */
export const hasConfiguredHours = Object.values(business.hours).some((d) => d.length > 0);

export const GOOGLE_RATING = {
  // ΠΡΑΓΜΑΤΙΚΑ δεδομένα Google (Οκτ. 2025) — με πηγή/σύνδεσμο, όχι κατασκευασμένα.
  // Εμφανίζονται ΜΟΝΟ ως σύνδεσμος προς Google· ΔΕΝ μπαίνουν σε schema aggregateRating.
  value: 4.8,
  count: 25,
  verifiedOn: "2025-10",
};
