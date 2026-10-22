/**
 * Φωτογραφίες site που ανεβάζει ο ιδιοκτήτης από το admin.
 * Αποθήκευση στο persistent volume (/data/uploads στην παραγωγή) ώστε να μη
 * χάνονται σε redeploy. Σερβίρονται μέσω /api/photos/[id].
 */
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  (process.env.NODE_ENV === "production" ? "/data/uploads" : path.join(process.cwd(), ".uploads"));

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

export type Slot = "hero" | "contact" | "gallery";
export const SLOTS: Slot[] = ["hero", "contact", "gallery"];

function extFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export function contentTypeFor(localPath: string): string {
  if (localPath.endsWith(".png")) return "image/png";
  if (localPath.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function saveUploadedPhoto(slot: Slot, file: File): Promise<{ ok: boolean; error?: string }> {
  if (!ALLOWED.includes(file.type)) return { ok: false, error: "Μη αποδεκτός τύπος (JPG/PNG/WebP)." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Πολύ μεγάλο αρχείο (έως 8MB)." };

  await fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(file.type)}`;
  const full = path.join(UPLOAD_DIR, base);
  await fs.writeFile(full, Buffer.from(await file.arrayBuffer()));

  if (slot === "gallery") {
    const count = await prisma.sitePhoto.count({ where: { slot } });
    await prisma.sitePhoto.create({ data: { slot, localPath: full, order: count } });
  } else {
    // hero/contact: μία φωτό — αντικατάσταση.
    const prev = await prisma.sitePhoto.findMany({ where: { slot } });
    for (const p of prev) await fs.rm(p.localPath).catch(() => {});
    await prisma.sitePhoto.deleteMany({ where: { slot } });
    await prisma.sitePhoto.create({ data: { slot, localPath: full, order: 0 } });
  }
  return { ok: true };
}

export async function deletePhoto(id: string): Promise<void> {
  const p = await prisma.sitePhoto.findUnique({ where: { id } });
  if (!p) return;
  await fs.rm(p.localPath).catch(() => {});
  await prisma.sitePhoto.delete({ where: { id } }).catch(() => {});
}

export async function getPhotos(slot: Slot) {
  return prisma.sitePhoto.findMany({ where: { slot }, orderBy: { order: "asc" } }).catch(() => []);
}

export function photoUrl(id: string): string {
  return `/api/photos/${id}`;
}

export async function heroOverride(): Promise<{ src: string; alt: string } | null> {
  const rows = await getPhotos("hero");
  return rows[0] ? { src: photoUrl(rows[0].id), alt: "Το ΤΟ ΚΟΥΡΕΙΟΝ 27 στον Κορυδαλλό" } : null;
}
export async function contactOverride(): Promise<{ src: string; alt: string } | null> {
  const rows = await getPhotos("contact");
  return rows[0] ? { src: photoUrl(rows[0].id), alt: "Η πρόσοψη του ΤΟ ΚΟΥΡΕΙΟΝ 27 στον Κορυδαλλό" } : null;
}
export async function galleryOverride(): Promise<{ src: string; alt: string }[]> {
  const rows = await getPhotos("gallery");
  return rows.map((r, i) => ({ src: photoUrl(r.id), alt: `Φωτογραφία ${i + 1} — ΤΟ ΚΟΥΡΕΙΟΝ 27` }));
}
