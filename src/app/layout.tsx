import type { Metadata } from "next";
import { Inter, Noto_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["greek", "latin"],
  variable: "--font-sans",
  display: "swap",
});

// Noto Serif: κομψή serif με πλήρη υποστήριξη ελληνικών (για τους τίτλους & το «27»).
const notoSerif = Noto_Serif({
  subsets: ["greek", "latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ΤΟ ΚΟΥΡΕΙΟΝ 27 — Κουρείο στον Κορυδαλλό",
    template: "%s · ΤΟ ΚΟΥΡΕΙΟΝ 27",
  },
  description:
    "ΤΟ ΚΟΥΡΕΙΟΝ 27 — σύγχρονο κουρείο στον Κορυδαλλό. Κούρεμα, fade, περιποίηση γενειάδας και παραδοσιακό ξύρισμα. Κλείσε ραντεβού online.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={`${inter.variable} ${notoSerif.variable}`}>
      <body className="min-h-screen bg-ink-950 font-sans antialiased">{children}</body>
    </html>
  );
}
