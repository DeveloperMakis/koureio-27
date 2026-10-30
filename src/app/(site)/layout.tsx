import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { ChatWidget } from "@/components/ChatWidget";
import { SmoothScroll } from "@/components/SmoothScroll";
import { assistantConfigured } from "@/lib/assistant";
import { business } from "@/config/business";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function LocalBusinessJsonLd() {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const openingHoursSpecification = Object.entries(business.hours).flatMap(([day, intervals]) =>
    intervals.map((iv) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${dayNames[Number(day)]}`,
      opens: iv.open,
      closes: iv.close,
    })),
  );

  const data = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: business.name,
    description: "Σύγχρονο κουρείο στον Κορυδαλλό: κούρεμα, fade, γενειάδα και παραδοσιακό ξύρισμα.",
    url: SITE_URL,
    telephone: business.phones[0]?.tel,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      postalCode: business.address.postalCode.replace(/\s/g, ""),
      addressCountry: "GR",
    },
    ...(business.geo
      ? { geo: { "@type": "GeoCoordinates", latitude: business.geo.lat, longitude: business.geo.lng } }
      : {}),
    openingHoursSpecification,
    ...(business.social.instagram ? { sameAs: [business.social.instagram] } : {}),
    // ΔΕΝ περιλαμβάνεται aggregateRating (καμία κατασκευασμένη βαθμολογία).
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-[72px] md:pb-0">
      <SmoothScroll />
      <noscript>
        <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
      </noscript>
      <a href="#main" className="skip-link">
        Μετάβαση στο περιεχόμενο
      </a>
      <LocalBusinessJsonLd />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <MobileBottomBar />
      {assistantConfigured() && <ChatWidget />}
    </div>
  );
}
