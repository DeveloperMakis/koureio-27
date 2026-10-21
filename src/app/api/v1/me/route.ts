import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customerFromRequest } from "@/lib/auth-customer";
import { profileUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauth() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const id = await customerFromRequest(req);
  if (!id) return unauth();
  const c = await prisma.customer.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, phone: true, favoriteBarberId: true, notifyPush: true },
  });
  if (!c) return unauth();
  return NextResponse.json({ ok: true, customer: c });
}

export async function PATCH(req: NextRequest) {
  const id = await customerFromRequest(req);
  if (!id) return unauth();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Μη έγκυρο αίτημα." }, { status: 400 });
  }
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Ελέγξτε τα στοιχεία." }, { status: 400 });
  const d = parsed.data;

  if (d.favoriteBarberId) {
    const b = await prisma.barber.findFirst({ where: { id: d.favoriteBarberId, active: true }, select: { id: true } });
    if (!b) return NextResponse.json({ ok: false, error: "Μη έγκυρος κουρέας." }, { status: 400 });
  }

  const c = await prisma.customer.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
      ...(d.favoriteBarberId !== undefined ? { favoriteBarberId: d.favoriteBarberId } : {}),
      ...(d.notifyPush !== undefined ? { notifyPush: d.notifyPush } : {}),
    },
    select: { id: true, email: true, name: true, phone: true, favoriteBarberId: true, notifyPush: true },
  });
  return NextResponse.json({ ok: true, customer: c });
}

/**
 * Διαγραφή λογαριασμού. Χειρίζεται ρητά τα μελλοντικά ραντεβού:
 * - Ακυρώνει τα μελλοντικά CONFIRMED (ελευθερώνει τη διαθεσιμότητα).
 * - Αποσυνδέει τα υπόλοιπα (customerId → null) ώστε να μείνουν ως ανώνυμα
 *   ιστορικά/λειτουργικά στοιχεία του καταστήματος (δεν διαγράφονται).
 * - Διαγράφει sessions/devices/notifications (cascade) + τον λογαριασμό.
 */
export async function DELETE(req: NextRequest) {
  const id = await customerFromRequest(req);
  if (!id) return unauth();

  await prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { customerId: id, status: "CONFIRMED", startAt: { gte: new Date() } },
      data: { status: "CANCELLED", slotKey: null },
    });
    await tx.booking.updateMany({ where: { customerId: id }, data: { customerId: null } });
    await tx.customer.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
