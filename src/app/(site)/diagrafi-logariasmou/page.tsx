import type { Metadata } from "next";
import { business } from "@/config/business";

export const metadata: Metadata = {
  title: "Διαγραφή λογαριασμού",
  description: "Πώς να διαγράψετε τον λογαριασμό σας στην εφαρμογή ΤΟ ΚΟΥΡΕΙΟΝ 27 και τι δεδομένα διαγράφονται.",
  alternates: { canonical: "/diagrafi-logariasmou" },
};

export default function AccountDeletionPage() {
  const phone = business.phones.find((p) => p.primary) ?? business.phones[0];
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-display text-3xl font-semibold text-bone">Διαγραφή λογαριασμού</h1>
      <p className="mt-2 text-sm text-bone-muted">Εφαρμογή «ΤΟ ΚΟΥΡΕΙΟΝ 27» · {business.name}</p>

      <div className="mt-8 space-y-5 text-sm leading-relaxed text-bone-muted [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-bone [&_strong]:text-bone">
        <h2>Από την εφαρμογή</h2>
        <p>
          Στην εφαρμογή: <strong>Προφίλ → Διαγραφή λογαριασμού</strong>. Μετά την επιβεβαίωση, ο
          λογαριασμός διαγράφεται οριστικά.
        </p>

        <h2>Εναλλακτικά</h2>
        <p>
          Μπορείτε να ζητήσετε διαγραφή επικοινωνώντας μαζί μας
          {phone ? (
            <>
              {" "}στο{" "}
              <a href={`tel:${phone.tel}`} className="underline hover:text-bone">
                {phone.display}
              </a>
            </>
          ) : null}
          {business.email ? ` ή στο ${business.email}` : ""}. Θα επιβεβαιώσουμε την ταυτότητά σας πριν τη
          διαγραφή.
        </p>

        <h2>Τι διαγράφεται</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Ο λογαριασμός σας (όνομα, email, τηλέφωνο), οι συνεδρίες και οι εγγεγραμμένες συσκευές.</li>
          <li>Οι ειδοποιήσεις (inbox) που σχετίζονται με τον λογαριασμό.</li>
        </ul>

        <h2>Τι γίνεται με τα ραντεβού</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Μελλοντικά</strong> επιβεβαιωμένα ραντεβού ακυρώνονται (ελευθερώνεται η ώρα).</li>
          <li>
            <strong>Παρελθόντα</strong> ραντεβού διατηρούνται <strong>ανώνυμα</strong> (αποσυνδέονται από
            τον λογαριασμό) ως λειτουργικά/ιστορικά στοιχεία του καταστήματος, όπως απαιτείται.
          </li>
        </ul>

        <h2>Χρόνος</h2>
        <p>Η διαγραφή του λογαριασμού είναι άμεση. [Συμπληρώστε τυχόν χρόνο διατήρησης ανώνυμων στοιχείων, αν ισχύει.]</p>
      </div>
    </div>
  );
}
