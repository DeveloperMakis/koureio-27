import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminId } from "@/lib/auth";
import { createBookingSeries } from "@/lib/booking-service";
import { manualBookingSchema } from "@/lib/validation";
import { formatAthensDateLong } from "@/lib/datetime";

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

  const repeat = (parsed.data.repeat ?? "none") as "none" | "2w" | "3w" | "1m";
  const series = await createBookingSeries(
    {
      serviceId: parsed.data.serviceId,
      serviceIds: parsed.data.serviceIds,
      barberId: parsed.data.barberId,
      date: parsed.data.date,
      time: parsed.data.time,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone ?? "",
      notes: parsed.data.notes,
    },
    "admin",
    repeat,
  );
  const result = series.first;

  if (!result.ok) {
    const msg =
      result.error === "SLOT_TAKEN"
        ? "Η ώρα είναι ήδη κατειλημμένη."
        : result.error === "OUTSIDE_HOURS"
          ? "Εκτός ωραρίου του κουρέα."
          : "Δεν ήταν δυνατή η κράτηση.";
    return NextResponse.json({ ok: false, error: msg }, { status: 409 });
  }

  const booked = series.occurrences.filter((o) => o.booked).length;
  const skipped = series.occurrences.filter((o) => !o.booked).map((o) => formatAthensDateLong(o.date));
  return NextResponse.json({
    ok: true,
    code: result.booking.code,
    series: repeat !== "none" ? { booked, skipped } : null,
  });
}
