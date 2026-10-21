import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customerFromRequest } from "@/lib/auth-customer";
import { createBooking } from "@/lib/booking-service";
import { mobileBookingSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Δημιουργία κράτησης από συνδεδεμένο πελάτη (ίδια server-side λογική). */
export async function POST(req: NextRequest) {
  const customerId = await customerFromRequest(req);
  if (!customerId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`mbook:${customerId}:${ip}`, 10, 60_000).ok)
    return NextResponse.json({ ok: false, error: "Πολλές προσπάθειες." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }
  const parsed = mobileBookingSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Ελέγξτε τα στοιχεία." }, { status: 400 });

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const idemKey = req.headers.get("idempotency-key") || undefined;

  const result = await createBooking(
    {
      serviceId: parsed.data.serviceId,
      serviceIds: parsed.data.serviceIds,
      barberId: parsed.data.barberId,
      date: parsed.data.date,
      time: parsed.data.time,
      customerName: customer.name,
      customerPhone: customer.phone ?? "",
      customerEmail: customer.email,
      notes: parsed.data.notes,
    },
    "online",
    idemKey,
    customerId,
  );

  if (!result.ok) {
    const status = result.error === "SLOT_TAKEN" ? 409 : 400;
    return NextResponse.json({ ok: false, errorCode: result.error }, { status });
  }

  const b = result.booking;
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  return NextResponse.json({
    ok: true,
    reused: result.reused ?? false,
    code: b.code,
    cancelToken: b.cancelToken,
    manageUrl: `${base}/rantevou/${b.cancelToken}`,
    icsUrl: `${base}/api/bookings/${b.cancelToken}/ics`,
    startAtISO: b.startAt.toISOString(),
    endAtISO: b.endAt.toISOString(),
    serviceName: b.serviceName,
    barberName: b.barberName,
    durationMin: b.durationMin,
    priceCents: b.priceCents,
  });
}
