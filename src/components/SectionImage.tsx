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
        className={`object-cover transition-transform duration-[1400ms] ease-out will-change-transform group-hover:scale-[1.06] ${
          kenBurns ? "animate-ken-burns" : ""
        }`}
      />
      {cinematic && (
        <>
          {/* Σβήσιμο στο σκοτάδι + ελαφρύ μπρονζέ άγγιγμα από πάνω */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/10 to-transparent" />
          {/* Βινιέτα για βάθος */}
          <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.55)]" />
        </>
      )}
    </div>
  );
}
