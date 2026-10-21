import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminId } from "@/lib/auth";
import { createBooking } from "@/lib/booking-service";
import { manualBookingSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const adminId = await getCurrentAdminId();
  if (!adminId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }

  const parsed = manualBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Ελέγξτε τα στοιχεία." },
      { status: 400 },
    );
  }

  const result = await createBooking(
    {
      serviceId: parsed.data.serviceId,
      barberId: parsed.data.barberId,
      date: parsed.data.date,
      time: parsed.data.time,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone ?? "",
      notes: parsed.data.notes,
    },
    "admin",
  );

  if (!result.ok) {
    const msg =
      result.error === "SLOT_TAKEN"
        ? "Η ώρα είναι ήδη κατειλημμένη."
        : result.error === "OUTSIDE_HOURS"
          ? "Εκτός ωραρίου του κουρέα."
          : "Δεν ήταν δυνατή η κράτηση.";
    return NextResponse.json({ ok: false, error: msg }, { status: 409 });
  }

  return NextResponse.json({ ok: true, code: result.booking.code });
}
