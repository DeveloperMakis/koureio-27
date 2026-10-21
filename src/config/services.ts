/**
 * ΚΑΤΑΛΟΓΟΣ ΥΠΗΡΕΣΙΩΝ (υποψήφιες κατηγορίες — ΟΧΙ επιβεβαιωμένες)
 * --------------------------------------------------------------------------
 * Χρησιμοποιείται ΜΟΝΟ ως αρχικό seed για τη βάση. Στο δημόσιο website
 * εμφανίζονται ΜΟΝΟ οι υπηρεσίες που ο ιδιοκτήτης ενεργοποιεί από το /admin.
 *
 * - price: null  → καμία επινοημένη τιμή. Ο ιδιοκτήτης ορίζει τιμή στο admin.
 * - durationMin  → ΠΡΟΤΕΙΝΟΜΕΝΗ διάρκεια (λειτουργική ρύθμιση, επεξεργάσιμη).
 *                  Χρειάζεται για τον υπολογισμό διαθέσιμων ωρών· ο ιδιοκτήτης
 *                  την επιβεβαιώνει/αλλάζει.
 * - active: false → τίποτα δεν δημοσιεύεται πριν το εγκρίνει ο ιδιοκτήτης.
 */

export interface ServiceSeed {
  slug: string;
  name: string;
  description: string;
  durationMin: number; // προτεινόμενη, επεξεργάσιμη
  priceCents: number | null; // null = δεν έχει οριστεί
  active: boolean;
  order: number;
}

export const serviceCatalog: ServiceSeed[] = [
  {
    slug: "androiko-kourema",
    name: "Ανδρικό κούρεμα",
    description: "Κλασικό ή μοντέρνο κούρεμα, προσαρμοσμένο στο στυλ και τα χαρακτηριστικά σου.",
    durationMin: 30,
    priceCents: null,
    active: false,
    order: 1,
  },
  {
    slug: "fade",
    name: "Fade / Skin fade",
    description: "Καθαρές, σταδιακές μεταβάσεις με προσοχή στη λεπτομέρεια και άψογο φινίρισμα.",
    durationMin: 40,
    priceCents: null,
    active: false,
    order: 2,
  },
  {
    slug: "genia",
    name: "Περιποίηση γενειάδας",
    description: "Σχηματισμός, τριμάρισμα και περιποίηση γενειάδας με ζεστή πετσέτα.",
    durationMin: 20,
    priceCents: null,
    active: false,
    order: 3,
  },
  {
    slug: "kourema-genia",
    name: "Κούρεμα & γενειάδα",
    description: "Ολοκληρωμένη περιποίηση: κούρεμα και σχηματισμός γενειάδας σε ένα ραντεβού.",
    durationMin: 50,
    priceCents: null,
    active: false,
    order: 4,
  },
  {
    slug: "paradosiako-xyrisma",
    name: "Παραδοσιακό ξύρισμα",
    description: "Ξύρισμα με ξυράφι και ζεστή πετσέτα, στην παραδοσιακή τεχνική του κουρείου.",
    durationMin: 30,
    priceCents: null,
    active: false,
    order: 5,
  },
  {
    slug: "paidiko-kourema",
    name: "Παιδικό κούρεμα",
    description: "Κούρεμα για τους μικρούς μας πελάτες, με υπομονή και φιλική διάθεση.",
    durationMin: 30,
    priceCents: null,
    active: false,
    order: 6,
  },
  {
    slug: "lousimo-styling",
    name: "Λούσιμο & styling",
    description: "Λούσιμο και φινίρισμα styling για ολοκληρωμένο, φρεσκαρισμένο αποτέλεσμα.",
    durationMin: 20,
    priceCents: null,
    active: false,
    order: 7,
  },
];
