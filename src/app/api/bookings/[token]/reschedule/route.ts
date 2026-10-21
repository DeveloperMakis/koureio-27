import { NextRequest, NextResponse } from "next/server";
import { rescheduleBooking } from "@/lib/booking-service";
import { rescheduleSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import type { BookingErrorCode } from "@/lib/booking-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MSG: Record<BookingErrorCode, string> = {
  SERVICE_NOT_FOUND: "Η υπηρεσία δεν είναι διαθέσιμη.",
  NO_BARBER: "Δεν υπάρχει διαθέσιμος κουρέας.",
  OUTSIDE_HOURS: "Η ώρα είναι εκτός ωραρίου. Επιλέξτε άλλη.",
  SLOT_TAKEN: "Η ώρα είναι ήδη κατειλημμένη. Το αρχικό ραντεβού διατηρήθηκε.",
  TOO_SOON: "Η ώρα είναι πολύ κοντά. Επιλέξτε αργότερη.",
  TOO_FAR: "Η ημερομηνία είναι εκτός διαστήματος κρατήσεων.",
  TOO_LATE: "Τόσο κοντά στο ραντεβού, η αλλαγή γίνεται μόνο τηλεφωνικά.",
  IDEMPOTENCY_CONFLICT: "Διπλό αίτημα με διαφορετικά στοιχεία. Δοκιμάστε ξανά.",
  NOT_FOUND: "Η κράτηση δεν βρέθηκε.",
  NOT_CHANGEABLE: "Η κράτηση δεν μπορεί να αλλάξει.",
  SYSTEM_NOT_READY: "Μη διαθέσιμο αυτή τη στιγμή.",
  UNKNOWN: "Κάτι πήγε στραβά. Δοκιμάστε ξανά.",
};

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`resched:${ip}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Πολλές προσπάθειες." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }
  const parsed = rescheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Ελέγξτε τα στοιχεία." },
      { status: 400 },
    );
  }

  const result = await rescheduleBooking(params.token, parsed.data);
  if (!result.ok) {
    const status = result.error === "SLOT_TAKEN" ? 409 : 400;
    return NextResponse.json({ ok: false, errorCode: result.error, error: MSG[result.error] }, { status });
  }

  const b = result.booking;
  return NextResponse.json({
    ok: true,
    code: b.code,
    startAtISO: b.startAt.toISOString(),
    endAtISO: b.endAt.toISOString(),
    barberName: b.barberName,
  });
}
