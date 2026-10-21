import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { MEDIA_DIR } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Σερβίρει τοπικά αποθηκευμένη εικόνα Instagram (δεν εξαρτάται από CDN της Meta). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  // Ασφάλεια: μόνο έγκυρα IG media id (καθόλου path traversal).
  if (!/^[A-Za-z0-9_]+$/.test(id)) return new NextResponse("Not found", { status: 404 });

  const row = await prisma.instagramMedia.findUnique({ where: { id } });
  if (!row?.localPath) return new NextResponse("Not found", { status: 404 });

  // Επιβεβαίωση ότι το αρχείο βρίσκεται μέσα στον φάκελο media.
  const file = path.join(MEDIA_DIR, `${id}.jpg`);
  if (!file.startsWith(path.resolve(MEDIA_DIR))) return new NextResponse("Not found", { status: 404 });

  try {
    const buf = await fs.readFile(file);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
