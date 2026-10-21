import { NextRequest, NextResponse } from "next/server";
import { syncInstagram } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Χειροκίνητος/προγραμματισμένος συγχρονισμός Instagram (προστασία με WORKER_SECRET). */
export async function POST(req: NextRequest) {
  const secret = process.env.WORKER_SECRET;
  if (!secret || req.headers.get("x-worker-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const result = await syncInstagram();
  return NextResponse.json({ ok: true, ...result });
}
