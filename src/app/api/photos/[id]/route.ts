import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { prisma } from "@/lib/db";
import { contentTypeFor } from "@/lib/site-photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Σερβίρει φωτογραφία που ανέβασε ο ιδιοκτήτης (από το volume). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!/^[A-Za-z0-9]+$/.test(params.id)) return new NextResponse("Not found", { status: 404 });
  const row = await prisma.sitePhoto.findUnique({ where: { id: params.id } });
  if (!row) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(row.localPath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(row.localPath),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
