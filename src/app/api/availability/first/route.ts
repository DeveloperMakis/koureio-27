import { NextRequest, NextResponse } from "next/server";
import { findFirstAvailable } from "@/lib/availability";
import { firstAvailableQuerySchema } from "@/lib/validation";
import { loadServiceBundle } from "@/lib/service-bundle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = firstAvailableQuerySchema.safeParse({
    serviceId: sp.get("serviceId") ?? undefined,
    serviceIds: sp.get("serviceIds") ?? undefined,
    barberId: sp.get("barberId") ?? undefined,
    fromDate: sp.get("fromDate") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });

  const ids = parsed.data.serviceIds
    ? parsed.data.serviceIds.split(",").map((s) => s.trim()).filter(Boolean)
    : parsed.data.serviceId
      ? [parsed.data.serviceId]
      : [];
  const bundle = await loadServiceBundle(ids);
  if (!bundle) return NextResponse.json({ error: "SERVICE_NOT_FOUND" }, { status: 404 });

  const first = await findFirstAvailable({
    durationMin: bundle.totalDuration,
    barberId: parsed.data.barberId,
    fromDate: parsed.data.fromDate,
  });

  return NextResponse.json({ first });
}
