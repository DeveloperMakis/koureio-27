import { NextRequest, NextResponse } from "next/server";
import { cancelBookingByToken } from "@/lib/booking-service";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  NOT_FOUND: "Η κράτηση δεν βρέθηκε.",
  NOT_CANCELLABLE: "Η κράτηση δεν μπορεί να ακυρωθεί.",
  TOO_LATE: "Η ακύρωση online δεν είναι πλέον διαθέσιμη. Παρακαλώ τηλεφωνήστε μας.",
};

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`cancel:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Πολλές προσπάθειες." }, { status: 429 });
  }

  const result = await cancelBookingByToken(params.token);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: REASONS[result.reason ?? ""] ?? "Δεν ήταν δυνατή η ακύρωση." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
