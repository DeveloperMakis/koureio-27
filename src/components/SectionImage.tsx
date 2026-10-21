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
}: {
  photo: Photo | null | undefined;
  label?: string;
  ratio?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (!photo) {
    return <PlaceholderImage label={label} ratio={ratio} className={className} />;
  }
  return (
    <div
      className={`relative ${ratio} overflow-hidden rounded-xl border border-bronze/15 ${className}`}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
