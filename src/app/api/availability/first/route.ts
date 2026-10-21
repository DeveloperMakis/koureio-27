import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findFirstAvailable } from "@/lib/availability";
import { firstAvailableQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = firstAvailableQuerySchema.safeParse({
    serviceId: sp.get("serviceId") ?? "",
    barberId: sp.get("barberId") ?? undefined,
    fromDate: sp.get("fromDate") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, active: true },
    select: { durationMin: true },
  });
  if (!service) return NextResponse.json({ error: "SERVICE_NOT_FOUND" }, { status: 404 });

  const first = await findFirstAvailable({
    durationMin: service.durationMin,
    barberId: parsed.data.barberId,
    fromDate: parsed.data.fromDate,
  });

  return NextResponse.json({ first });
}
