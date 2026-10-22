import Link from "next/link";
import { hero, about, faqs, gallery as galleryContent } from "@/content/site";
import { business } from "@/config/business";
import { Reveal } from "@/components/Reveal";
import { SectionImage } from "@/components/SectionImage";
import { photos } from "@/config/photos";
import { ServiceList } from "@/components/ServiceList";
import { GalleryCarousel } from "@/components/GalleryCarousel";
import { Faq } from "@/components/Faq";
import { ReviewsSection } from "@/components/ReviewsSection";
import { ContactSection } from "@/components/ContactSection";
import { getGalleryMedia } from "@/lib/instagram";
import { heroOverride, galleryOverride } from "@/lib/site-photos";

// Η αρχική διαβάζει ενεργές υπηρεσίες από τη βάση και δείχνει «Ανοιχτά τώρα»·
// render ανά αίτημα (όχι static) ώστε να είναι πάντα ενημερωμένη.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const confirmedFaqs = faqs.filter((f) => f.confirmed);

  // Gallery: Instagram (αν ρυθμισμένο) → ανεβασμένες από admin → στατικές.
  const [igGallery, uploadedGallery, heroUp] = await Promise.all([
    getGalleryMedia(12),
    galleryOverride(),
    heroOverride(),
  ]);
  const galleryImages =
    igGallery.length > 0
      ? igGallery.map((m) => ({ src: m.src, alt: m.alt }))
      : uploadedGallery.length > 0
        ? uploadedGallery
        : photos.gallery.map((p) => ({ src: p.src, alt: p.alt }));
  // Hero: ανεβασμένη από admin → στατική.
  const heroPhoto = heroUp ?? photos.hero;

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="grain relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-1/2 -z-10 -translate-y-1/2 select-none font-display text-[22rem] font-bold leading-none text-bronze/5 sm:text-[30rem]"
        >
          27
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 md:grid-cols-2 md:pb-24 md:pt-20">
          <div>
            <Reveal>
              <p className="text-sm uppercase tracking-widest2 text-bronze">{hero.eyebrow}</p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] text-bone sm:text-6xl">
                {hero.title}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-md text-base leading-relaxed text-bone-muted sm:text-lg">
                {hero.subtitle}
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={hero.primaryCta.href}
                  className="rounded-full bg-bronze px-7 py-3 text-base font-semibold text-ink-950 transition-colors hover:bg-bronze-light"
                >
                  {hero.primaryCta.label}
                </Link>
                <Link
                  href={hero.secondaryCta.href}
                  className="rounded-full border border-bronze/40 px-7 py-3 text-base font-semibold text-bone transition-colors hover:border-bronze"
                >
                  {hero.secondaryCta.label}
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="relative">
            <SectionImage
              photo={heroPhoto}
              label="Φωτογραφία κουρείου"
              ratio="aspect-[4/5]"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </Reveal>
        </div>
      </section>

      {/* ---------------- ΥΠΗΡΕΣΙΕΣ ---------------- */}
      <section id="ypiresies" className="scroll-mt-24 border-t border-bronze/10 bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <SectionHeading eyebrow="Τι προσφέρουμε" title="Υπηρεσίες & τιμές" />
          <div className="mt-10">
            <ServiceList />
          </div>
        </div>
      </section>

      {/* ---------------- Ο ΧΩΡΟΣ ΜΑΣ ---------------- */}
      <section id="o-choros" className="scroll-mt-24 border-t border-bronze/10">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <Reveal className="order-2 grid grid-cols-2 gap-3 md:order-1">
            <SectionImage photo={photos.space[0]} label="Ο χώρος" ratio="aspect-[3/4]" sizes="(max-width: 768px) 50vw, 25vw" />
            <SectionImage photo={photos.space[1]} label="Λεπτομέρεια" ratio="aspect-[3/4]" sizes="(max-width: 768px) 50vw, 25vw" className="mt-8" />
          </Reveal>
          <div className="order-1 md:order-2">
            <SectionHeading eyebrow="Το κουρείο" title={about.title} />
            <div className="mt-6 space-y-4">
              {about.paragraphs.map((p, i) => (
                <Reveal key={i} delay={i * 60} as="p" className="text-bone-muted leading-relaxed">
                  {p}
                </Reveal>
              ))}
            </div>

            {about.team.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-6">
                {about.team.map((m) => (
                  <div key={m.name} className="text-sm">
                    <p className="font-semibold text-bone">{m.name}</p>
                    <p className="text-bone-dim">{m.role}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- GALLERY ---------------- */}
      <section id="gallery" className="scroll-mt-24 border-t border-bronze/10 bg-ink-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <SectionHeading eyebrow={galleryContent.subtitle} title={galleryContent.title} />
          <div className="mt-10">
            <GalleryCarousel images={galleryImages} placeholderCount={galleryContent.placeholderCount} />
          </div>
          {business.social.instagram && (
            <div className="mt-8 text-center">
              <a
                href={business.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full border border-bronze/40 px-6 py-2.5 text-sm font-semibold text-bronze-light hover:bg-bronze hover:text-ink-950"
              >
                Δες περισσότερα στο Instagram
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- ΑΞΙΟΛΟΓΗΣΕΙΣ ---------------- */}
      <section className="border-t border-bronze/10">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
          <ReviewsSection />
        </div>
      </section>

      {/* ---------------- ΣΥΧΝΕΣ ΕΡΩΤΗΣΕΙΣ (μόνο επιβεβαιωμένες) ---------------- */}
      {confirmedFaqs.length > 0 && (
        <section id="faq" className="scroll-mt-24 border-t border-bronze/10 bg-ink-950">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
            <SectionHeading eyebrow="Καλό να ξέρεις" title="Συχνές ερωτήσεις" />
            <div className="mt-10">
              <Faq items={confirmedFaqs.map((f) => ({ q: f.q, a: f.a }))} />
            </div>
          </div>
        </section>
      )}

      {/* ---------------- ΕΠΙΚΟΙΝΩΝΙΑ ---------------- */}
      <section id="epikoinonia" className="scroll-mt-24 border-t border-bronze/10">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <SectionHeading eyebrow="Πού θα μας βρεις" title="Επικοινωνία" />
          <div className="mt-10">
            <ContactSection />
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Reveal>
      <p className="text-sm uppercase tracking-widest2 text-bronze">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold text-bone sm:text-4xl">{title}</h2>
    </Reveal>
  );
}
