import Link from "next/link";
import { prisma } from "@/lib/db";
import { business } from "@/config/business";
import { formatPrice, formatDuration } from "@/lib/money";
import { Reveal } from "@/components/Reveal";

export async function ServiceList() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  if (services.length === 0) {
    const phone = business.phones.find((p) => p.primary) ?? business.phones[0];
    return (
      <div className="rounded-2xl border border-bronze/15 bg-ink-900 p-8 text-center">
        <p className="text-lg text-bone">Ο κατάλογος υπηρεσιών ανακοινώνεται σύντομα.</p>
        <p className="mt-2 text-sm text-bone-muted">
          Μέχρι τότε, κλείστε ραντεβού ή ενημερωθείτε τηλεφωνικά.
        </p>
        {phone && (
          <a
            href={`tel:${phone.tel}`}
            className="mt-5 inline-flex rounded-full border border-bronze/40 px-6 py-2.5 text-sm font-semibold text-bronze-light hover:bg-bronze hover:text-ink-950"
          >
            Κλήση {phone.display}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {services.map((s, i) => {
        const price = formatPrice(s.priceCents);
        return (
          <Reveal
            key={s.id}
            delay={i * 60}
            className="flex flex-col justify-between rounded-2xl border border-bronze/15 bg-ink-900 p-6 transition-colors hover:border-bronze/35"
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-xl font-semibold text-bone">{s.name}</h3>
                {price && (
                  <span className="shrink-0 rounded-full bg-bronze/10 px-3 py-1 text-sm font-semibold text-bronze-light">
                    {price}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-bone-muted">{s.description}</p>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-bone-dim">
                {formatDuration(s.durationMin)}
              </span>
              <Link
                href={`/rantevou?service=${s.slug}`}
                className="rounded-full bg-bronze px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-bronze-light"
              >
                Κράτηση
              </Link>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
