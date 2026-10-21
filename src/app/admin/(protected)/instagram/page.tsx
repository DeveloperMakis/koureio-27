import { instagramStatus } from "@/lib/instagram";
import { setInstagramTokenAction, syncInstagramAction } from "@/app/admin/actions";
import { formatAthensDateLong, formatAthensTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function AdminInstagramPage() {
  const st = await instagramStatus();
  const inputCls =
    "w-full rounded-lg border border-bronze/20 bg-ink-950 px-3 py-2 text-sm text-bone outline-none focus:border-bronze";

  let lastSyncLabel = "—";
  if (st.lastSync) {
    const d = new Date(st.lastSync);
    const ds = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    lastSyncLabel = `${formatAthensDateLong(ds)} στις ${formatAthensTime(d)}`;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-bone">Instagram</h1>
      <p className="mt-1 text-sm text-bone-muted">
        Οι φωτογραφίες του λογαριασμού σου εμφανίζονται αυτόματα στο gallery της αρχικής. Οι εικόνες
        κατεβαίνουν στον server, ώστε να μη «χαλάνε». Ανανεώνονται αυτόματα κάθε λίγες ώρες.
      </p>

      {/* Κατάσταση */}
      <div className="mt-6 rounded-2xl border border-bronze/15 bg-ink-900 p-5">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.configured ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-200"}`}>
            {st.configured ? "Συνδεδεμένο" : "Μη συνδεδεμένο"}
          </span>
          <span className="text-bone-muted">Φωτογραφίες: <span className="text-bone">{st.count}</span></span>
          <span className="text-bone-muted">Τελευταίος συγχρονισμός: <span className="text-bone">{lastSyncLabel}</span></span>
          {st.tokenMasked && <span className="text-bone-dim">token: {st.tokenMasked}</span>}
        </div>
        {st.configured && (
          <form action={syncInstagramAction} className="mt-4">
            <button type="submit" className="rounded-full bg-bronze px-5 py-2 text-sm font-semibold text-ink-950 hover:bg-bronze-light">
              Συγχρονισμός τώρα
            </button>
          </form>
        )}
      </div>

      {/* Token */}
      <form action={setInstagramTokenAction} className="mt-6 rounded-2xl border border-bronze/15 bg-ink-900 p-5">
        <h2 className="mb-1 font-semibold text-bone">Σύνδεση / Access Token</h2>
        <p className="mb-4 text-sm text-bone-muted">
          Επικόλλησε εδώ το <strong>Instagram access token</strong> (long-lived). Οδηγίες για το πώς το βγάζεις
          υπάρχουν παρακάτω. Αφού αποθηκευτεί, γίνεται αμέσως ο πρώτος συγχρονισμός.
        </p>
        <label className="block text-sm">
          <span className="mb-1 block text-bone-muted">Access token</span>
          <input name="token" className={inputCls} placeholder="IGAAxxxxxxxx…" autoComplete="off" />
        </label>
        <button type="submit" className="mt-4 rounded-full bg-bronze px-5 py-2 text-sm font-semibold text-ink-950 hover:bg-bronze-light">
          Αποθήκευση & σύνδεση
        </button>
      </form>

      {/* Οδηγίες */}
      <div className="mt-6 rounded-2xl border border-bronze/15 bg-ink-900 p-5 text-sm text-bone-muted">
        <h2 className="mb-2 font-semibold text-bone">Πώς βγάζω το token (μία φορά)</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Κάνε τον λογαριασμό Instagram <strong>Business</strong> ή <strong>Creator</strong> (Ρυθμίσεις → Τύπος λογαριασμού).</li>
          <li>Πήγαινε στο <strong>developers.facebook.com</strong> → Create App → τύπος «Business».</li>
          <li>Πρόσθεσε το προϊόν <strong>Instagram</strong> → «Instagram API setup with Instagram login».</li>
          <li>Σύνδεσε τον λογαριασμό σου και δημιούργησε ένα <strong>long-lived access token</strong>.</li>
          <li>Αντίγραψέ το και επικόλλησέ το παραπάνω. Τέλος!</li>
        </ol>
        <p className="mt-3 text-xs text-bone-dim">
          Το token ανανεώνεται αυτόματα από το σύστημα πριν λήξει. Αν κάποια στιγμή πάψει να δουλεύει,
          απλώς βγάλε νέο και επικόλλησέ το ξανά εδώ.
        </p>
      </div>
    </div>
  );
}
