import { NextRequest, NextResponse } from "next/server";
import { getDayAvailability } from "@/lib/availability";
import { availabilityQuerySchema } from "@/lib/validation";
import { loadServiceBundle } from "@/lib/service-bundle";
import { bookingConfig } from "@/config/booking";
import { todayAthens, addDays } from "@/lib/datetime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Παράγει πίνακα serviceIds από ?serviceIds=a,b ή ?serviceId=a. */
function parseServiceIds(serviceIds?: string, serviceId?: string): string[] {
  if (serviceIds) return serviceIds.split(",").map((s) => s.trim()).filter(Boolean);
  return serviceId ? [serviceId] : [];
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = availabilityQuerySchema.safeParse({
    serviceId: sp.get("serviceId") ?? undefined,
    serviceIds: sp.get("serviceIds") ?? undefined,
    date: sp.get("date") ?? "",
    barberId: sp.get("barberId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
  }
  const { serviceId, serviceIds, date, barberId } = parsed.data;

  // Όρια ημερομηνίας
  const today = todayAthens();
  const maxDate = addDays(today, bookingConfig.maxAdvanceDays);
  if (date < today || date > maxDate) {
    return NextResponse.json({ dateStr: date, anySlots: [], perBarber: [], outOfRange: true });
  }

  const ids = parseServiceIds(serviceIds, serviceId);
  const bundle = await loadServiceBundle(ids);
  if (!bundle) {
    return NextResponse.json({ error: "SERVICE_NOT_FOUND" }, { status: 404 });
  }

  const availability = await getDayAvailability({
    dateStr: date,
    durationMin: bundle.totalDuration,
    barberId,
  });

  return NextResponse.json(availability);
}
