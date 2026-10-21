import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/booking-service";
import { createBookingSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import { notificationStatus } from "@/lib/notifications";
import type { BookingErrorCode } from "@/lib/booking-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<BookingErrorCode, string> = {
  SERVICE_NOT_FOUND: "Η υπηρεσία δεν είναι διαθέσιμη. Δοκιμάστε ξανά.",
  NO_BARBER: "Δεν υπάρχει διαθέσιμος κουρέας αυτή τη στιγμή.",
  OUTSIDE_HOURS: "Η ώρα που επιλέξατε είναι εκτός ωραρίου. Επιλέξτε άλλη ώρα.",
  SLOT_TAKEN: "Η ώρα μόλις καλύφθηκε. Διάλεξε μία από τις παρακάτω διαθέσιμες.",
  TOO_SOON: "Η ώρα είναι πολύ κοντά. Επιλέξτε αργότερη ώρα.",
  TOO_FAR: "Η ημερομηνία είναι εκτός διαθέσιμου διαστήματος κρατήσεων.",
  TOO_LATE: "Τόσο κοντά στο ραντεβού, η αλλαγή/ακύρωση γίνεται μόνο τηλεφωνικά.",
  IDEMPOTENCY_CONFLICT: "Διπλό αίτημα με διαφορετικά στοιχεία. Ανανεώστε και δοκιμάστε ξανά.",
  NOT_FOUND: "Η κράτηση δεν βρέθηκε.",
  NOT_CHANGEABLE: "Η κράτηση δεν μπορεί να αλλάξει.",
  SYSTEM_NOT_READY: "Οι online κρατήσεις δεν είναι διαθέσιμες αυτή τη στιγμή.",
  UNKNOWN: "Κάτι πήγε στραβά. Δοκιμάστε ξανά σε λίγο.",
};

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`book:${ip}`, 8, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }

  // Honeypot κατά των bots.
  if (body && typeof body === "object" && (body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Ελέγξτε τα στοιχεία σας.";
    return NextResponse.json({ ok: false, error: first }, { status: 400 });
  }

  // Idempotency key: header ή body (αποτρέπει διπλή κράτηση από διπλό submit).
  const idemKey =
    req.headers.get("idempotency-key") ||
    (typeof body === "object" && body && (body as Record<string, unknown>).idempotencyKey) ||
    undefined;

  const result = await createBooking(parsed.data, "online", idemKey ? String(idemKey) : undefined);
  if (!result.ok) {
    const status = result.error === "SLOT_TAKEN" ? 409 : 400;
    return NextResponse.json(
      { ok: false, errorCode: result.error, error: ERROR_MESSAGES[result.error] },
      { status },
    );
  }

  const b = result.booking;
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  return NextResponse.json({
    ok: true,
    reused: result.reused ?? false,
    code: b.code,
    manageUrl: `${base}/rantevou/${b.cancelToken}`,
    icsUrl: `${base}/api/bookings/${b.cancelToken}/ics`,
    startAtISO: b.startAt.toISOString(),
    endAtISO: b.endAt.toISOString(),
    serviceName: b.serviceName,
    durationMin: b.durationMin,
    priceCents: b.priceCents,
    barberName: b.barberName,
    // Ακριβής κατάσταση ειδοποιήσεων (ΔΕΝ ψευδώς «στάλθηκε»).
    notifications: notificationStatus(),
  });
}
