import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customerFromRequest } from "@/lib/auth-customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = await customerFromRequest(req);
  if (!id) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const rows = await prisma.booking.findMany({
    where: { customerId: id },
    include: { barber: { select: { name: true } } },
    orderBy: { startAt: "desc" },
    take: 100,
  });

  const now = Date.now();
  const map = (b: (typeof rows)[number]) => ({
    code: b.code,
    cancelToken: b.cancelToken,
    serviceName: b.serviceName,
    barberName: b.barber.name,
    startAtISO: b.startAt.toISOString(),
    endAtISO: b.endAt.toISOString(),
    durationMin: b.durationMin,
    priceCents: b.priceCents,
    status: b.status,
  });

  const upcoming = rows
    .filter((b) => b.status === "CONFIRMED" && b.startAt.getTime() >= now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .map(map);
  const past = rows.filter((b) => !(b.status === "CONFIRMED" && b.startAt.getTime() >= now)).map(map);

  return NextResponse.json({ ok: true, upcoming, past });
}
