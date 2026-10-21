/**
 * ΕΝΣΩΜΑΤΩΣΗ INSTAGRAM (επίσημο Instagram Graph API — Instagram Login)
 * --------------------------------------------------------------------------
 * - Τραβά τις πρόσφατες δημοσιεύσεις μέσω `graph.instagram.com/me/media`.
 * - ΚΑΤΕΒΑΖΕΙ τις εικόνες τοπικά στο volume, ώστε να μη «σπάνε» όταν λήγουν τα
 *   προσωρινά CDN URL της Meta (νόμιμη χρήση: περιεχόμενο του ίδιου του λογαριασμού).
 * - Ανανεώνει αυτόματα το long-lived token πριν λήξει (ανά ~50 ημέρες).
 * - ΔΕΝ κάνει scraping· χρειάζεται access token από τον λογαριασμό (δες admin).
 */
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";

const GRAPH = "https://graph.instagram.com";

/** Φάκελος αποθήκευσης εικόνων (persistent volume στην παραγωγή). */
export const MEDIA_DIR =
  process.env.INSTAGRAM_MEDIA_DIR ||
  (process.env.NODE_ENV === "production" ? "/data/instagram" : path.join(process.cwd(), ".instagram-cache"));

const TOKEN_KEY = "instagram_token";
const REFRESHED_KEY = "instagram_token_refreshed_at";
const SYNCED_KEY = "instagram_synced_at";

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}
async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

/** Το ενεργό token: από τη βάση (admin) ή fallback από env IG_ACCESS_TOKEN. */
export async function getToken(): Promise<string | null> {
  const fromDb = await getSetting(TOKEN_KEY);
  return fromDb || process.env.IG_ACCESS_TOKEN || null;
}

export async function setToken(token: string): Promise<void> {
  await setSetting(TOKEN_KEY, token.trim());
  await setSetting(REFRESHED_KEY, new Date().toISOString());
}

export async function isConfigured(): Promise<boolean> {
  return !!(await getToken());
}

interface IgMediaItem {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  timestamp: string;
}

/** Ανανέωση long-lived token αν έχει περάσει αρκετός καιρός (ασφαλές να κληθεί συχνά). */
async function maybeRefreshToken(token: string): Promise<void> {
  const last = await getSetting(REFRESHED_KEY);
  const lastMs = last ? Date.parse(last) : 0;
  const days = (Date.now() - lastMs) / 86400000;
  if (lastMs && days < 45) return; // ανανέωση ~κάθε 45 ημέρες (token ζει 60)
  try {
    const url = `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
    const r = await fetch(url);
    if (!r.ok) return;
    const j = (await r.json()) as { access_token?: string };
    if (j.access_token) {
      await setSetting(TOKEN_KEY, j.access_token);
      await setSetting(REFRESHED_KEY, new Date().toISOString());
    }
  } catch {
    /* η ανανέωση θα ξαναδοκιμαστεί στο επόμενο sync */
  }
}

async function downloadTo(file: string, url: string): Promise<boolean> {
  try {
    const r = await fetch(url);
    if (!r.ok) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0) return false;
    await fs.writeFile(file, buf);
    return true;
  } catch {
    return false;
  }
}

export interface SyncResult {
  configured: boolean;
  fetched: number;
  stored: number;
  error?: string;
}

/**
 * Συγχρονισμός: τραβά media, κατεβάζει εικόνες, ενημερώνει τη βάση, καθαρίζει όσα
 * αφαιρέθηκαν από το feed. Idempotent — ασφαλές να τρέχει επαναλαμβανόμενα.
 */
export async function syncInstagram(limit = 18): Promise<SyncResult> {
  const token = await getToken();
  if (!token) return { configured: false, fetched: 0, stored: 0 };

  await maybeRefreshToken(token);
  const liveToken = (await getToken()) || token;

  const fields = "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp";
  const url = `${GRAPH}/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(liveToken)}`;

  let items: IgMediaItem[];
  try {
    const r = await fetch(url);
    const j = (await r.json()) as { data?: IgMediaItem[]; error?: { message?: string } };
    if (!r.ok || j.error) return { configured: true, fetched: 0, stored: 0, error: j.error?.message || `HTTP ${r.status}` };
    items = j.data ?? [];
  } catch (e) {
    return { configured: true, fetched: 0, stored: 0, error: e instanceof Error ? e.message : "fetch failed" };
  }

  await fs.mkdir(MEDIA_DIR, { recursive: true }).catch(() => {});

  let stored = 0;
  const keepIds: string[] = [];
  let order = 0;
  for (const it of items) {
    // Μόνο εικόνες & carousel (για video χρησιμοποιούμε το thumbnail).
    const src = it.media_type === "VIDEO" ? it.thumbnail_url : it.media_url || it.thumbnail_url;
    if (!src) continue;
    keepIds.push(it.id);

    const existing = await prisma.instagramMedia.findUnique({ where: { id: it.id } });
    let localPath = existing?.localPath ?? null;
    const file = path.join(MEDIA_DIR, `${it.id}.jpg`);
    // Κατέβασε αν δεν υπάρχει ήδη τοπικά.
    const haveFile = localPath ? await fs.stat(file).then(() => true).catch(() => false) : false;
    if (!haveFile) {
      if (await downloadTo(file, src)) localPath = file;
    }

    await prisma.instagramMedia.upsert({
      where: { id: it.id },
      update: { mediaType: it.media_type, caption: it.caption ?? null, permalink: it.permalink, takenAt: new Date(it.timestamp), localPath, order },
      create: {
        id: it.id,
        mediaType: it.media_type,
        caption: it.caption ?? null,
        permalink: it.permalink,
        takenAt: new Date(it.timestamp),
        localPath,
        order,
      },
    });
    if (localPath) stored++;
    order++;
  }

  // Καθάρισε όσα δεν υπάρχουν πια στο feed (DB + αρχεία).
  const stale = await prisma.instagramMedia.findMany({ where: { id: { notIn: keepIds.length ? keepIds : ["__none__"] } } });
  for (const s of stale) {
    if (s.localPath) await fs.rm(s.localPath).catch(() => {});
    await prisma.instagramMedia.delete({ where: { id: s.id } }).catch(() => {});
  }

  await setSetting(SYNCED_KEY, new Date().toISOString());
  return { configured: true, fetched: items.length, stored };
}

/** Αυτόματος συγχρονισμός με throttle (καλείται από τον worker). */
export async function maybeSyncInstagram(minHours = 6): Promise<void> {
  if (!(await isConfigured())) return;
  const last = await getSetting(SYNCED_KEY);
  const hours = last ? (Date.now() - Date.parse(last)) / 3600000 : Infinity;
  if (hours < minHours) return;
  await syncInstagram().catch(() => {});
}

export interface GalleryItem {
  src: string;
  alt: string;
  permalink: string;
}

/** Φωτογραφίες για το gallery (μόνο όσες έχουν κατέβει τοπικά). */
export async function getGalleryMedia(limit = 12): Promise<GalleryItem[]> {
  const rows = await prisma.instagramMedia
    .findMany({ where: { localPath: { not: null } }, orderBy: { order: "asc" }, take: limit })
    .catch(() => []);
  return rows.map((r) => ({
    src: `/api/instagram/media/${r.id}`,
    alt: r.caption?.slice(0, 120) || "Φωτογραφία από το Instagram του ΤΟ ΚΟΥΡΕΙΟΝ 27",
    permalink: r.permalink,
  }));
}

/** Κατάσταση για το admin. */
export async function instagramStatus() {
  const [token, synced, count] = await Promise.all([
    getToken(),
    getSetting(SYNCED_KEY),
    prisma.instagramMedia.count().catch(() => 0),
  ]);
  return {
    configured: !!token,
    tokenMasked: token ? `${token.slice(0, 6)}…${token.slice(-4)}` : null,
    lastSync: synced,
    count,
  };
}
