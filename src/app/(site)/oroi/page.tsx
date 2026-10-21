import type { Metadata } from "next";
import { business } from "@/config/business";
import { bookingConfig } from "@/config/booking";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Όροι κρατήσεων",
  alternates: { canonical: "/oroi" },
};

export default function TermsPage() {
  return (
    <LegalShell title="Όροι κρατήσεων">
      <h2>Κρατήσεις</h2>
      <p>
        Η κράτηση ραντεβού γίνεται online ή τηλεφωνικά. Μετά την επιβεβαίωση λαμβάνετε μοναδικό
        κωδικό κράτησης και σύνδεσμο διαχείρισης.
      </p>

      <h2>Αλλαγή & ακύρωση</h2>
      <p>
        Μπορείτε να ακυρώσετε το ραντεβού σας μέσω του συνδέσμου διαχείρισης έως{" "}
        {bookingConfig.selfCancelHours} ώρες πριν την ώρα του ραντεβού. Για αλλαγές ή ακυρώσεις
        κοντά στην ώρα του ραντεβού, παρακαλούμε τηλεφωνήστε μας
        {business.phones[0] ? ` στο ${business.phones[0].display}` : ""}.
      </p>

      <h2>Καθυστέρηση & μη προσέλευση</h2>
      <p>
        Σε περίπτωση καθυστέρησης, ενδέχεται η διάρκεια της υπηρεσίας να προσαρμοστεί. [Συμπληρώστε
        την πολιτική σας για καθυστερήσεις και μη προσέλευση.]
      </p>

      <h2>Πληρωμή</h2>
      <p>Η πληρωμή γίνεται στο κατάστημα. Δεν απαιτείται προκαταβολή για την κράτηση.</p>

      <h2>Τιμές & διάρκεια</h2>
      <p>
        Οι τιμές και οι διάρκειες των υπηρεσιών εμφανίζονται στον ιστότοπο όπου έχουν οριστεί και
        ενδέχεται να προσαρμοστούν ανάλογα με τις ανάγκες του κάθε πελάτη.
      </p>

      <h2>Επικοινωνία</h2>
      <p>
        {business.name}, {business.address.full}
        {business.phones[0] ? ` — ${business.phones[0].display}` : ""}.
      </p>
    </LegalShell>
  );
}
