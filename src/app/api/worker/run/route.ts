import { NextRequest, NextResponse } from "next/server";
import { runWorker } from "@/lib/outbox-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Τρέχει τον worker (σάρωση υπενθυμίσεων + αποστολή outbox). Προστατεύεται με
 * WORKER_SECRET. Καλείται από scheduled job (Vercel Cron / external cron) ή από
 * το τοπικό poller (`npm run worker`). GET & POST υποστηρίζονται.
 */
async function handle(req: NextRequest) {
  const secret = process.env.WORKER_SECRET;
  const provided = req.headers.get("x-worker-secret") || req.nextUrl.searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const stats = await runWorker();
  return NextResponse.json({ ok: true, ...stats });
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}
