import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { business } from "@/config/business";
import { formatPrice, formatDuration } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Δημόσιος κατάλογος για την εφαρμογή (χωρίς auth). */
export async function GET() {
  const [services, barbers] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: [{ recommended: "desc" }, { order: "asc" }] }),
    prisma.barber.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  return NextResponse.json({
    ok: true,
    business: {
      name: business.name,
      area: business.area,
      address: business.address.full,
      phones: business.phones,
      instagram: business.social.instagram,
      mapsDirectionsUrl: business.maps.directionsUrl,
      hours: business.hours,
    },
    services: services.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      durationMin: s.durationMin,
      durationLabel: formatDuration(s.durationMin),
      priceCents: s.priceCents,
      priceLabel: formatPrice(s.priceCents),
      recommended: s.recommended,
    })),
    barbers: barbers.map((b) => ({ id: b.id, name: b.name })),
  });
}
