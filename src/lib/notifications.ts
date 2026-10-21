/**
 * Κατάσταση ειδοποιήσεων (email/SMS).
 * --------------------------------------------------------------------------
 * Επιστρέφει ΑΚΡΙΒΗ κατάσταση: "configured" μόνο όταν έχει συνδεθεί πραγματικός
 * πάροχος μέσω env. Χωρίς πάροχο → "not_configured". ΔΕΝ προσποιούμαστε ποτέ ότι
 * στάλθηκε μήνυμα. Η αποστολή υλοποιείται όταν συνδεθεί πάροχος.
 */
export function notificationStatus(): { email: "configured" | "not_configured"; sms: "configured" | "not_configured" } {
  return {
    email: process.env.EMAIL_PROVIDER ? "configured" : "not_configured",
    sms: process.env.SMS_PROVIDER ? "configured" : "not_configured",
  };
}
