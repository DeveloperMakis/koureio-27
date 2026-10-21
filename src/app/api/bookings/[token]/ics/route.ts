import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildIcs } from "@/lib/ics";
import { business } from "@/config/business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const booking = await prisma.booking.findUnique({ where: { cancelToken: params.token } });
  if (!booking || booking.status !== "CONFIRMED") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const ics = buildIcs({
    uid: `${booking.code}@koureion27`,
    start: booking.startAt,
    end: booking.endAt,
    summary: `${business.name} — ${booking.serviceName}`,
    description: `Κωδικός κράτησης: ${booking.code}`,
    location: business.address.full,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="koureion27-${booking.code}.ics"`,
    },
  });
}
