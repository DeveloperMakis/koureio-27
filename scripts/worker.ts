/**
 * Τοπικός worker poller: καλεί περιοδικά το /api/worker/run του backend.
 * Για self-hosting: τρέξε `npm run start` (Next) και `npm run worker` παράλληλα.
 * Για serverless: χρησιμοποίησε scheduled job (Vercel Cron / external) στο ίδιο URL.
 *
 * Χρήση:  WORKER_SECRET=... npm run worker
 */
try {
  // Φόρτωση .env αν υπάρχει dotenv (transitive dep).
  require("dotenv").config();
} catch {
  /* ignore */
}

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SECRET = process.env.WORKER_SECRET || "";
const INTERVAL = Number(process.env.WORKER_INTERVAL_MS || 60_000);

if (!SECRET) {
  console.error("⚠ WORKER_SECRET δεν έχει οριστεί — ο worker θα παίρνει 401. Όρισέ το στο .env.");
}

async function tick() {
  try {
    const res = await fetch(`${BASE}/api/worker/run`, { method: "POST", headers: { "x-worker-secret": SECRET } });
    const d = await res.json().catch(() => ({}) as any);
    if (!res.ok) {
      console.error(new Date().toISOString(), "worker HTTP", res.status, d.error ?? "");
      return;
    }
    if (d.reminders || d.sent || d.failed || d.skipped) {
      console.log(new Date().toISOString(), "worker", d);
    }
  } catch (e) {
    console.error(new Date().toISOString(), "worker tick error", e instanceof Error ? e.message : e);
  }
}

console.log(`Outbox worker poller → ${BASE}/api/worker/run κάθε ${INTERVAL}ms`);
tick();
setInterval(tick, INTERVAL);
