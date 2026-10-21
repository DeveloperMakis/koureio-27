import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { waitlistSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import { customerFromRequest } from "@/lib/auth-customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`waitlist:${ip}`, 6, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Πολλές προσπάθειες." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }
  // Honeypot
  if (body && typeof body === "object" && (body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }

  const parsed = waitlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Ελέγξτε τα στοιχεία." },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Επιβεβαίωση ότι η υπηρεσία είναι ενεργή.
  const service = await prisma.service.findFirst({ where: { id: d.serviceId, active: true }, select: { id: true } });
  if (!service) return NextResponse.json({ ok: false, error: "Η υπηρεσία δεν είναι διαθέσιμη." }, { status: 400 });

  // Αν ο αιτών είναι συνδεδεμένος πελάτης (app), σύνδεσε το αίτημα για push/inbox.
  const customerId = await customerFromRequest(req).catch(() => null);

  await prisma.waitlist.create({
    data: {
      serviceId: d.serviceId,
      barberId: d.barberId || null,
      dateFrom: d.dateFrom,
      dateTo: d.dateTo,
      timeFrom: d.timeFrom || null,
      timeTo: d.timeTo || null,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      customerId: customerId ?? null,
      status: "OPEN",
    },
  });

  return NextResponse.json({ ok: true });
}
