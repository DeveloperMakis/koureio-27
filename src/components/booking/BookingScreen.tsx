import { prisma } from "@/lib/db";
import { bookingSystemReady } from "@/lib/availability";
import { bookingConfig } from "@/config/booking";
import { business } from "@/config/business";
import { photos } from "@/config/photos";
import { formatPrice, formatDuration } from "@/lib/money";
import { todayAthens, addDays, weekdayOf, athensWallToUtc, WEEKDAYS_EL, MONTHS_EL } from "@/lib/datetime";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { BookingUnavailable } from "@/components/booking/BookingUnavailable";

export async function BookingScreen({ initialServiceSlug }: { initialServiceSlug?: string }) {
  const ready = await bookingSystemReady();

  const header = (
    <header className="mb-8">
      <p className="text-sm uppercase tracking-widest2 text-bronze">ΤΟ ΚΟΥΡΕΙΟΝ 27</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-bone sm:text-4xl">Κλείσε ραντεβού</h1>
      <p className="mt-2 text-sm text-bone-muted">Η πληρωμή γίνεται στο κατάστημα. Δεν χρειάζεται λογαριασμός.</p>
    </header>
  );

  if (!ready.ready) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
        {header}
        <BookingUnavailable />
      </div>
    );
  }

  const [servicesRaw, barbersRaw] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: [{ recommended: "desc" }, { order: "asc" }] }),
    prisma.barber.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  const services = servicesRaw.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    durationLabel: formatDuration(s.durationMin),
    priceCents: s.priceCents,
    priceLabel: formatPrice(s.priceCents),
    recommended: s.recommended,
  }));

  const barbers = barbersRaw.map((b) => ({
    id: b.id,
    name: b.name,
    photo: photos.team[b.name]?.src ?? null,
  }));

  const today = todayAthens();

  // Ολοήμερα κλεισίματα όλου του καταστήματος (π.χ. αργίες) → σημαίνονται «κλειστά».
  const lastDate = addDays(today, bookingConfig.maxAdvanceDays);
  const shopClosures = await prisma.closure.findMany({
    where: {
      barberId: null,
      startAt: { lt: athensWallToUtc(addDays(lastDate, 1), "00:00") },
      endAt: { gt: athensWallToUtc(today, "00:00") },
    },
    select: { startAt: true, endAt: true },
  });
  function fullyClosed(dateStr: string): boolean {
    const dayStart = athensWallToUtc(dateStr, "00:00");
    const dayEnd = athensWallToUtc(addDays(dateStr, 1), "00:00");
    return shopClosures.some((c) => c.startAt <= dayStart && c.endAt >= dayEnd);
  }

  const dates = Array.from({ length: bookingConfig.maxAdvanceDays + 1 }).map((_, i) => {
    const value = addDays(today, i);
    const wd = weekdayOf(value);
    return {
      value,
      weekdayShort: WEEKDAYS_EL[wd].slice(0, 3),
      dayNum: Number(value.split("-")[2]),
      monthShort: MONTHS_EL[Number(value.split("-")[1]) - 1].slice(0, 3),
      closed: (business.hours[wd] ?? []).length === 0 || fullyClosed(value),
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
      {header}
      <BookingFlow
        services={services}
        barbers={barbers}
        dates={dates}
        initialServiceSlug={initialServiceSlug}
        phone={business.phones.find((p) => p.primary) ?? business.phones[0] ?? null}
        selfCancelHours={bookingConfig.selfCancelHours}
        mapsDirectionsUrl={business.maps.directionsUrl}
      />
    </div>
  );
}
