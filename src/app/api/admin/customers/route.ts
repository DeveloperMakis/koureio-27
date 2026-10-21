import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentAdminId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Αναζήτηση υπάρχοντος πελάτη (admin only) από προηγούμενες κρατήσεις.
 * Επιστρέφει μοναδικούς συνδυασμούς ονόματος+τηλεφώνου για γρήγορη συμπλήρωση.
 */
export async function GET(req: NextRequest) {
  const adminId = await getCurrentAdminId();
  if (!adminId) return NextResponse.json({ ok: false }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ ok: true, results: [] });

  // Φέρε κρατήσεις που ταιριάζουν σε όνομα ή τηλέφωνο.
  const rows = await prisma.booking.findMany({
    where: {
      OR: [{ customerName: { contains: q } }, { customerPhone: { contains: q } }],
    },
    select: { customerName: true, customerPhone: true, startAt: true, status: true, serviceName: true },
    orderBy: { startAt: "desc" },
    take: 300,
  });

  // Case-insensitive φιλτράρισμα + ομαδοποίηση (όνομα+τηλέφωνο) με στατιστικά.
  const ql = q.toLowerCase();
  const map = new Map<
    string,
    { name: string; phone: string; visits: number; lastVisit: string | null; lastService: string | null }
  >();
  for (const r of rows) {
    const name = r.customerName ?? "";
    const phone = r.customerPhone ?? "";
    if (!name.toLowerCase().includes(ql) && !phone.toLowerCase().includes(ql)) continue;
    const key = `${name}|${phone}`;
    const prev = map.get(key);
    const completed = r.status === "COMPLETED" || r.status === "CONFIRMED";
    if (!prev) {
      map.set(key, {
        name,
        phone,
        visits: completed ? 1 : 0,
        lastVisit: completed ? r.startAt.toISOString() : null,
        lastService: completed ? r.serviceName : null,
      });
    } else {
      if (completed) {
        prev.visits += 1;
        if (!prev.lastVisit || r.startAt.toISOString() > prev.lastVisit) {
          prev.lastVisit = r.startAt.toISOString();
          prev.lastService = r.serviceName;
        }
      }
    }
  }

  const results = Array.from(map.values())
    .sort((a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""))
    .slice(0, 10);

  return NextResponse.json({ ok: true, results });
}
