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

  // Φέρε πρόσφατες κρατήσεις που ταιριάζουν σε όνομα ή τηλέφωνο.
  const rows = await prisma.booking.findMany({
    where: {
      OR: [{ customerName: { contains: q } }, { customerPhone: { contains: q } }],
    },
    select: { customerName: true, customerPhone: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // Case-insensitive φιλτράρισμα + dedupe (όνομα+τηλέφωνο).
  const ql = q.toLowerCase();
  const seen = new Set<string>();
  const results: { name: string; phone: string }[] = [];
  for (const r of rows) {
    const name = r.customerName ?? "";
    const phone = r.customerPhone ?? "";
    if (!name.toLowerCase().includes(ql) && !phone.toLowerCase().includes(ql)) continue;
    const key = `${name}|${phone}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ name, phone });
    if (results.length >= 8) break;
  }

  return NextResponse.json({ ok: true, results });
}
