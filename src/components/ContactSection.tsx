import { business, hasConfiguredHours } from "@/config/business";
import { athensParts, WEEKDAYS_EL } from "@/lib/datetime";
import { OpenNow } from "@/components/OpenNow";
import { MapReveal } from "@/components/MapReveal";
import { SectionImage } from "@/components/SectionImage";
import { photos } from "@/config/photos";

export function ContactSection() {
  const today = athensParts(new Date()).weekday;
  // Ελληνική σειρά: Δευτέρα → Κυριακή
  const order = [1, 2, 3, 4, 5, 6, 0];
  const embedUrl = business.geo
    ? `https://maps.google.com/maps?q=${business.geo.lat},${business.geo.lng}&z=16&hl=el&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(business.maps.embedQuery)}&z=16&hl=el&output=embed`;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-sm uppercase tracking-widest text-bone-dim">Διεύθυνση</p>
          <p className="text-lg text-bone">{business.address.full}</p>
          <div className="mt-3">
            <OpenNow />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm uppercase tracking-widest text-bone-dim">Τηλέφωνο</p>
          {business.phones.map((p) => (
            <a
              key={p.tel}
              href={`tel:${p.tel}`}
              className="mr-4 inline-block text-lg text-bone hover:text-bronze-light"
            >
              {p.display} <span className="text-sm text-bone-dim">({p.label})</span>
            </a>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {business.social.instagram && (
            <a
              href={business.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-bronze/40 px-5 py-2.5 text-sm font-semibold text-bronze-light hover:bg-bronze hover:text-ink-950"
            >
              Instagram
            </a>
          )}
          <a
            href={business.maps.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-bronze px-5 py-2.5 text-sm font-semibold text-ink-950 hover:bg-bronze-light"
          >
            Οδηγίες στο Google Maps
          </a>
        </div>

        {hasConfiguredHours && (
          <div>
            <p className="mb-2 text-sm uppercase tracking-widest text-bone-dim">Ωράριο</p>
            <ul className="overflow-hidden rounded-xl border border-bronze/15">
              {order.map((d) => {
                const intervals = business.hours[d] ?? [];
                const isToday = d === today;
                return (
                  <li
                    key={d}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                      isToday ? "bg-bronze/10 text-bone" : "text-bone-muted"
                    }`}
                  >
                    <span className={isToday ? "font-semibold" : ""}>
                      {WEEKDAYS_EL[d]}
                      {isToday && <span className="ml-2 text-xs text-bronze">σήμερα</span>}
                    </span>
                    <span>
                      {intervals.length === 0
                        ? "Κλειστά"
                        : intervals.map((iv) => `${iv.open}–${iv.close}`).join(", ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <SectionImage
          photo={photos.contact}
          label="Πρόσοψη καταστήματος"
          ratio="aspect-[16/10]"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <MapReveal embedUrl={embedUrl} directionsUrl={business.maps.directionsUrl} />
        {business.address.plusCode && (
          <p className="mt-3 text-xs text-bone-dim">Plus code: {business.address.plusCode}</p>
        )}
      </div>
    </div>
  );
}
