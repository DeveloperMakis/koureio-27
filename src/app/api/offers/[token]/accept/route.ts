import { NextRequest, NextResponse } from "next/server";
import { acceptOffer } from "@/lib/waitlist-offer";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`offer-accept:${ip}`, 10, 60_000).ok)
    return NextResponse.json({ ok: false, error: "Πολλές προσπάθειες." }, { status: 429 });

  const result = await acceptOffer(params.token);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 409 });

  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  return NextResponse.json({
    ok: true,
    code: result.code,
    manageUrl: `${base}/rantevou/${result.cancelToken}`,
    icsUrl: `${base}/api/bookings/${result.cancelToken}/ics`,
  });
}
