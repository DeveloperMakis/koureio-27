import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ΤΟ ΚΟΥΡΕΙΟΝ 27 — Κουρείο στον Κορυδαλλό";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Σημείωση: η εικόνα OG χρησιμοποιεί το «27» ως κεντρικό στοιχείο και λατινικό
// tagline, ώστε να αποδίδεται πάντα καθαρά σε κάθε πλατφόρμα. Μπορείτε να την
// αντικαταστήσετε με πραγματική φωτογραφία/λογότυπο (opengraph-image.png).
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(120% 120% at 50% 0%, #1a1a1e, #0a0a0b)",
          color: "#f4efe6",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 220,
            height: 220,
            borderRadius: 9999,
            border: "6px solid #b88a4e",
            color: "#d6ab73",
            fontSize: 120,
            fontWeight: 700,
          }}
        >
          27
        </div>
        <div style={{ marginTop: 44, fontSize: 56, fontWeight: 700, letterSpacing: 4 }}>
          TO KOUREION 27
        </div>
        <div style={{ marginTop: 14, fontSize: 28, color: "#b88a4e", letterSpacing: 10 }}>
          BARBER SHOP · KORYDALLOS
        </div>
      </div>
    ),
    size,
  );
}
