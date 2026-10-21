import { NextRequest, NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth-customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { refreshToken?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  if (body.refreshToken) await revokeSession(body.refreshToken);
  return NextResponse.json({ ok: true });
}
