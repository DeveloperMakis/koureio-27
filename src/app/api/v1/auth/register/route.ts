import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { hashPassword, createSession } from "@/lib/auth-customer";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`reg:${ip}`, 8, 60_000).ok)
    return NextResponse.json({ ok: false, error: "Πολλές προσπάθειες." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Ελέγξτε τα στοιχεία." }, { status: 400 });

  const { email, password, name, phone } = parsed.data;
  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ ok: false, error: "Υπάρχει ήδη λογαριασμός με αυτό το email." }, { status: 409 });

  const customer = await prisma.customer.create({
    data: { email, passwordHash: await hashPassword(password), name, phone: phone || null },
  });
  const tokens = await createSession(customer.id, req.headers.get("user-agent") ?? undefined);
  return NextResponse.json({
    ok: true,
    ...tokens,
    customer: { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone },
  });
}
