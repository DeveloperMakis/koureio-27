import { otpEnabled, smsConfigured } from "@/lib/otp";
import { setOtpEnabledAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [enabled, sms] = await Promise.all([otpEnabled(), Promise.resolve(smsConfigured())]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-bone">Ρυθμίσεις</h1>
      <p className="mt-1 text-sm text-bone-muted">Ασφάλεια & έλεγχος κρατήσεων.</p>

      {/* Επιβεβαίωση τηλεφώνου με SMS (OTP) */}
      <form action={setOtpEnabledAction} className="mt-6 rounded-2xl border border-bronze/15 bg-ink-900 p-5">
        <h2 className="font-semibold text-bone">Επιβεβαίωση τηλεφώνου με SMS (νέοι πελάτες)</h2>
        <p className="mt-1 text-sm text-bone-muted">
          Όταν είναι ενεργό, οι <strong>νέοι/άγνωστοι</strong> πελάτες επιβεβαιώνουν το κινητό τους με κωδικό SMS
          πριν κλείσουν ραντεβού. Οι πελάτες με προηγούμενο ραντεβού δεν ξαναελέγχονται.
        </p>

        {!sms && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Δεν έχει ρυθμιστεί πάροχος SMS. Μέχρι να μπουν τα στοιχεία SMS (π.χ. αναβάθμιση Twilio), ο έλεγχος
            <strong> δεν εφαρμόζεται</strong> — οι κρατήσεις γίνονται κανονικά (ήπιο).
          </p>
        )}

        <label className="mt-4 flex items-center gap-2 text-sm text-bone">
          <input type="checkbox" name="enabled" defaultChecked={enabled} className="h-4 w-4 accent-bronze" />
          Ενεργοποίηση επιβεβαίωσης SMS για νέους πελάτες
        </label>

        <button
          type="submit"
          className="mt-4 rounded-full bg-bronze px-5 py-2 text-sm font-semibold text-ink-950 hover:bg-bronze-light"
        >
          Αποθήκευση
        </button>

        <p className="mt-3 text-xs text-bone-dim">
          Κατάσταση: {enabled ? "ενεργό" : "ανενεργό"} · Πάροχος SMS: {sms ? "ρυθμισμένος" : "μη ρυθμισμένος"}
        </p>
      </form>
    </div>
  );
}
