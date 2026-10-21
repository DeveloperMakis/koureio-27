import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customerFromRequest } from "@/lib/auth-customer";
import { deviceSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauth() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

/** Εγγραφή/ενημέρωση συσκευής για push. */
export async function POST(req: NextRequest) {
  const id = await customerFromRequest(req);
  if (!id) return unauth();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }
  const parsed = deviceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Μη έγκυρα στοιχεία συσκευής." }, { status: 400 });
  const d = parsed.data;

  // Αν το ίδιο push token ήταν σε άλλον λογαριασμό (αλλαγή χρήστη), αποσύνδεσέ το.
  await prisma.deviceRegistration.updateMany({
    where: { expoPushToken: d.expoPushToken, customerId: { not: id } },
    data: { disabledAt: new Date() },
  });

  await prisma.deviceRegistration.upsert({
    where: { customerId_installationId: { customerId: id, installationId: d.installationId } },
    update: { expoPushToken: d.expoPushToken, platform: d.platform, disabledAt: null },
    create: { customerId: id, installationId: d.installationId, expoPushToken: d.expoPushToken, platform: d.platform },
  });
  return NextResponse.json({ ok: true });
}

/** Αφαίρεση συσκευής (π.χ. στο logout). */
export async function DELETE(req: NextRequest) {
  const id = await customerFromRequest(req);
  if (!id) return unauth();
  let body: { installationId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  if (body.installationId) {
    await prisma.deviceRegistration
      .deleteMany({ where: { customerId: id, installationId: body.installationId } })
      .catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
