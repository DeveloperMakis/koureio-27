import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { verifyPassword, createSession } from "@/lib/auth-customer";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`login:${ip}`, 10, 60_000).ok)
    return NextResponse.json({ ok: false, error: "Πολλές προσπάθειες." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Συμπληρώστε email και κωδικό." }, { status: 400 });

  const customer = await prisma.customer.findUnique({ where: { email: parsed.data.email } });
  const fail = NextResponse.json({ ok: false, error: "Λάθος email ή κωδικός." }, { status: 401 });
  if (!customer) return fail;
  if (!(await verifyPassword(parsed.data.password, customer.passwordHash))) return fail;

  const tokens = await createSession(customer.id, req.headers.get("user-agent") ?? undefined);
  return NextResponse.json({
    ok: true,
    ...tokens,
    customer: { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone },
  });
}
