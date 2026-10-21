import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDayAvailability } from "@/lib/availability";
import { availabilityQuerySchema } from "@/lib/validation";
import { bookingConfig } from "@/config/booking";
import { todayAthens, addDays } from "@/lib/datetime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = availabilityQuerySchema.safeParse({
    serviceId: sp.get("serviceId") ?? "",
    date: sp.get("date") ?? "",
    barberId: sp.get("barberId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
  }
  const { serviceId, date, barberId } = parsed.data;

  // Όρια ημερομηνίας
  const today = todayAthens();
  const maxDate = addDays(today, bookingConfig.maxAdvanceDays);
  if (date < today || date > maxDate) {
    return NextResponse.json({ dateStr: date, anySlots: [], perBarber: [], outOfRange: true });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, active: true },
    select: { durationMin: true },
  });
  if (!service) {
    return NextResponse.json({ error: "SERVICE_NOT_FOUND" }, { status: 404 });
  }

  const availability = await getDayAvailability({
    dateStr: date,
    durationMin: service.durationMin,
    barberId,
  });

  return NextResponse.json(availability);
}
