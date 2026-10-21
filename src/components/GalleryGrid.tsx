"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PlaceholderImage } from "@/components/PlaceholderImage";

export interface GalleryImage {
  src: string;
  alt: string;
  category?: string;
}

/**
 * Responsive πλέγμα με lightbox (αφή + πληκτρολόγιο).
 * Αν δεν υπάρχουν πραγματικές εικόνες, εμφανίζει διακριτικά προσωρινά πλαίσια.
 * Τα φίλτρα εμφανίζονται μόνο όταν υπάρχουν αρκετές πραγματικές φωτογραφίες.
 */
export function GalleryGrid({
  images = [],
  placeholderCount = 8,
}: {
  images?: GalleryImage[];
  placeholderCount?: number;
}) {
  const hasImages = images.length > 0;
  const count = hasImages ? images.length : placeholderCount;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, next, prev]);

  const placeholderLabels = ["Κούρεμα", "Fade", "Γενειάδα", "Χώρος", "Λεπτομέρεια", "Styling"];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => {
                setIndex(i);
                setOpen(true);
              }}
              className="block w-full rounded-xl focus-visible:outline-none"
              aria-label={`Άνοιγμα φωτογραφίας ${i + 1}`}
            >
              {hasImages ? (
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-bronze/15">
                  <Image
                    src={images[i].src}
                    alt={images[i].alt}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                  />
                </div>
              ) : (
                <PlaceholderImage label={placeholderLabels[i % placeholderLabels.length]} />
              )}
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Προβολή φωτογραφίας"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/95 p-4 animate-fade-in"
          onClick={close}
          onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (dx > 50) prev();
            else if (dx < -50) next();
            touchStartX.current = null;
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Κλείσιμο"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-bronze/30 text-bone"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Προηγούμενη"
            className="absolute left-3 grid h-11 w-11 place-items-center rounded-full border border-bronze/30 text-bone sm:left-6"
          >
            ‹
          </button>
          <div className="max-h-[80vh] w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            {hasImages ? (
              <div className="relative mx-auto h-[72vh] w-full max-w-lg">
                <Image
                  src={images[index].src}
                  alt={images[index].alt}
                  fill
                  sizes="100vw"
                  className="rounded-xl object-contain"
                />
              </div>
            ) : (
              <PlaceholderImage
                ratio="aspect-[4/5]"
                label={placeholderLabels[index % placeholderLabels.length]}
              />
            )}
            <p className="mt-3 text-center text-sm text-bone-dim">
              {index + 1} / {count}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Επόμενη"
            className="absolute right-3 grid h-11 w-11 place-items-center rounded-full border border-bronze/30 text-bone sm:right-6"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
