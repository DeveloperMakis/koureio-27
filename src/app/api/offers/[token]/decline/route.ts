import { NextRequest, NextResponse } from "next/server";
import { declineOffer } from "@/lib/waitlist-offer";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`offer-decline:${ip}`, 10, 60_000).ok)
    return NextResponse.json({ ok: false, error: "Πολλές προσπάθειες." }, { status: 429 });

  await declineOffer(params.token);
  return NextResponse.json({ ok: true });
}
