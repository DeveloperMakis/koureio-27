import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { adminLoginSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`login:${ip}`, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Πολλές προσπάθειες. Δοκιμάστε αργότερα." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Συμπληρώστε email και κωδικό." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const admin = await prisma.admin.findUnique({ where: { email } });
  // Ίδιο μήνυμα για αποτυχία ώστε να μην αποκαλύπτεται αν υπάρχει ο λογαριασμός.
  const genericFail = NextResponse.json(
    { ok: false, error: "Λάθος στοιχεία σύνδεσης." },
    { status: 401 },
  );
  if (!admin) {
    await verifyPassword(parsed.data.password, "$2a$12$0000000000000000000000000000000000000000000000000000"); // σταθερός χρόνος
    return genericFail;
  }
  const valid = await verifyPassword(parsed.data.password, admin.passwordHash);
  if (!valid) return genericFail;

  const session = await getSession();
  session.adminId = admin.id;
  session.email = admin.email;
  await session.save();

  return NextResponse.json({ ok: true });
}
