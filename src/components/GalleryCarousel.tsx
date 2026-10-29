"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PlaceholderImage } from "@/components/PlaceholderImage";

export interface CarouselImage {
  src: string;
  alt: string;
}

/**
 * Εναλλασσόμενο gallery (auto-rotate) με cross-fade.
 * - Αλλάζει μόνο του ανά `intervalMs`, με παύση στο hover/focus.
 * - Χειροκίνητα βελάκια + κουκκίδες, πλοήγηση με πληκτρολόγιο.
 * - Σέβεται το prefers-reduced-motion (δεν αλλάζει αυτόματα).
 * - Αν δεν υπάρχουν φωτό, δείχνει διακριτικά προσωρινά πλαίσια.
 */
export function GalleryCarousel({
  images = [],
  placeholderCount = 5,
  intervalMs = 4500,
}: {
  images?: CarouselImage[];
  placeholderCount?: number;
  intervalMs?: number;
}) {
  const hasImages = images.length > 0;
  const count = hasImages ? images.length : placeholderCount;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceRef = useRef(false);

  const placeholderLabels = ["Κούρεμα", "Fade", "Γενειάδα", "Χώρος", "Λεπτομέρεια", "Styling"];

  const go = useCallback((n: number) => setIndex((p) => (p + n + count) % count), [count]);
  const to = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);

  useEffect(() => {
    reduceRef.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  useEffect(() => {
    if (paused || count <= 1 || reduceRef.current) return;
    const t = setInterval(() => setIndex((p) => (p + 1) % count), intervalMs);
    return () => clearInterval(t);
  }, [paused, count, intervalMs]);

  return (
    <div
      className="relative mx-auto max-w-3xl"
      role="group"
      aria-roledescription="καρουζέλ"
      aria-label="Φωτογραφίες από τον χώρο και τη δουλειά μας"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
      }}
      tabIndex={0}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-bronze/15 bg-ink-900">
        {Array.from({ length: count }).map((_, i) => {
          const active = i === index;
          return (
            <div
              key={i}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                active ? "opacity-100" : "opacity-0"
              }`}
            >
              {hasImages ? (
                <Image
                  src={images[i].src}
                  alt={images[i].alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className={`object-cover ${active ? "animate-ken-burns" : "scale-[1.04]"}`}
                  priority={i === 0}
                />
              ) : (
                <PlaceholderImage
                  ratio="h-full w-full"
                  label={placeholderLabels[i % placeholderLabels.length]}
                />
              )}
            </div>
          );
        })}

        {/* Κινηματογραφικό overlay (βάθος + σβήσιμο + letterbox μπάρες) */}
        {hasImages && (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/10 to-ink-950/15" />
            <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.75)]" />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[7%] bg-ink-950" />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[7%] bg-ink-950" />
          </>
        )}

        {/* Live region για screen readers */}
        <span className="sr-only" aria-live="polite">
          Εικόνα {index + 1} από {count}
        </span>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Προηγούμενη φωτογραφία"
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-bronze/30 bg-ink-950/60 text-bone backdrop-blur hover:bg-ink-950/80"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Επόμενη φωτογραφία"
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-bronze/30 bg-ink-950/60 text-bone backdrop-blur hover:bg-ink-950/80"
            >
              ›
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="Επιλογή φωτογραφίας">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Φωτογραφία ${i + 1}`}
              onClick={() => to(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-bronze" : "w-2 bg-bronze/30 hover:bg-bronze/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
