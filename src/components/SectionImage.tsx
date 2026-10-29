import Image from "next/image";
import type { Photo } from "@/config/photos";
import { PlaceholderImage } from "@/components/PlaceholderImage";

/**
 * Δείχνει πραγματική, βελτιστοποιημένη φωτογραφία (next/image → WebP/AVIF,
 * responsive, lazy) όταν υπάρχει· αλλιώς διακριτικό προσωρινό πλαίσιο.
 */
export function SectionImage({
  photo,
  label,
  ratio = "aspect-[4/5]",
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  className = "",
  cinematic = true,
  kenBurns = false,
  letterbox = false,
}: {
  photo: Photo | null | undefined;
  label?: string;
  ratio?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Κινηματογραφικό overlay (gradient που σβήνει στο σκοτάδι + βινιέτα). */
  cinematic?: boolean;
  /** Αργό zoom/pan «Ken Burns» (ιδανικό για hero). */
  kenBurns?: boolean;
  /** Μαύρες μπάρες πάνω/κάτω (widescreen look). */
  letterbox?: boolean;
}) {
  if (!photo) {
    return <PlaceholderImage label={label} ratio={ratio} className={className} />;
  }
  return (
    <div
      className={`group relative ${ratio} overflow-hidden rounded-xl border border-bronze/15 ${className}`}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover transition-transform duration-[1400ms] ease-out will-change-transform group-hover:scale-[1.09] ${
          kenBurns ? "animate-ken-burns" : ""
        }`}
      />
      {cinematic && (
        <>
          {/* Σβήσιμο στο σκοτάδι (πιο έντονο) */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/25 to-ink-950/10" />
          {/* Βαθιά βινιέτα */}
          <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_170px_rgba(0,0,0,0.75)]" />
        </>
      )}
      {letterbox && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[7%] bg-ink-950" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[7%] bg-ink-950" />
        </>
      )}
    </div>
  );
}
