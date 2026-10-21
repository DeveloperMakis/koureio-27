import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customerFromRequest } from "@/lib/auth-customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauth() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const id = await customerFromRequest(req);
  if (!id) return unauth();

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 20), 50);
  const before = req.nextUrl.searchParams.get("before"); // ISO cursor

  const items = await prisma.inAppNotification.findMany({
    where: { customerId: id, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const unreadCount = await prisma.inAppNotification.count({ where: { customerId: id, readAt: null } });

  return NextResponse.json({
    ok: true,
    unreadCount,
    nextCursor: items.length === limit ? items[items.length - 1].createdAt.toISOString() : null,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      bookingId: n.bookingId,
      data: n.data,
      read: n.readAt !== null,
      createdAtISO: n.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const id = await customerFromRequest(req);
  if (!id) return unauth();

  let body: { ids?: string[]; all?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  if (body.all) {
    await prisma.inAppNotification.updateMany({ where: { customerId: id, readAt: null }, data: { readAt: new Date() } });
  } else if (Array.isArray(body.ids) && body.ids.length) {
    await prisma.inAppNotification.updateMany({
      where: { customerId: id, id: { in: body.ids.slice(0, 100) } },
      data: { readAt: new Date() },
    });
  }
  const unreadCount = await prisma.inAppNotification.count({ where: { customerId: id, readAt: null } });
  return NextResponse.json({ ok: true, unreadCount });
}
