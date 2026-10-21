import { NextRequest, NextResponse } from "next/server";
import { refreshSchema } from "@/lib/validation";
import { rotateSession } from "@/lib/auth-customer";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`refresh:${ip}`, 30, 60_000).ok)
    return NextResponse.json({ ok: false, error: "Πολλές προσπάθειες." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });

  const tokens = await rotateSession(parsed.data.refreshToken, req.headers.get("user-agent") ?? undefined);
  if (!tokens) return NextResponse.json({ ok: false, error: "Η συνεδρία έληξε. Συνδεθείτε ξανά." }, { status: 401 });
  return NextResponse.json({ ok: true, ...tokens });
}
