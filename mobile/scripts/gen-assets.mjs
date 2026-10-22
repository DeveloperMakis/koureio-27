/**
 * Παράγει τα γραφικά της εφαρμογής από το λογότυπο (public/logo.png).
 * Τρέξε: node scripts/gen-assets.mjs
 * Χρειάζεται: npm install sharp  (dev tool — δεν μπαίνει στο app bundle)
 *
 * Όταν υπάρχει λογότυπο υψηλής ανάλυσης, απλώς αντικατέστησε το SRC και ξανατρέξε.
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.resolve(ROOT, "..", "public", "logo.png"); // πηγή λογοτύπου
const ASSETS = path.join(ROOT, "assets");
const BG = "#0a0a0b";

async function logoBuffer(size) {
  return sharp(SRC).resize(size, size, { fit: "contain", kernel: "lanczos3" }).png().toBuffer();
}

function canvas(w, h, bg = BG) {
  return sharp({ create: { width: w, height: h, channels: 4, background: bg } });
}

async function main() {
  // 1) App icon 1024×1024 (γεμάτο, χωρίς διαφάνεια) — το badge γεμίζει το τετράγωνο.
  await sharp(SRC)
    .resize(1024, 1024, { fit: "cover", kernel: "lanczos3" })
    .flatten({ background: BG })
    .png()
    .toFile(path.join(ASSETS, "icon.png"));

  // 2) Android adaptive foreground — λογότυπο ~68% στο κέντρο (safe zone).
  const fg = await logoBuffer(700);
  await canvas(1024, 1024)
    .composite([{ input: fg, gravity: "center" }])
    .png()
    .toFile(path.join(ASSETS, "adaptive-icon.png"));

  // 3) Splash 1242×1242 — λογότυπο κεντραρισμένο σε σκούρο φόντο.
  const sp = await logoBuffer(560);
  await canvas(1242, 1242)
    .composite([{ input: sp, gravity: "center" }])
    .png()
    .toFile(path.join(ASSETS, "splash.png"));

  // 4) Google Play feature graphic 1024×500.
  const fgraph = await logoBuffer(360);
  await canvas(1024, 500)
    .composite([{ input: fgraph, gravity: "center" }])
    .png()
    .toFile(path.join(ASSETS, "feature-graphic.png"));

  console.log("✔ Έτοιμα: icon.png, adaptive-icon.png, splash.png, feature-graphic.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
