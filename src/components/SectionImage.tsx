"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/config/photos";
import { PlaceholderImage } from "@/components/PlaceholderImage";

/**
 * Δείχνει πραγματική, βελτιστοποιημένη φωτογραφία (next/image → WebP/AVIF,
 * responsive, lazy) όταν υπάρχει· αλλιώς διακριτικό προσωρινό πλαίσιο.
 *
 * Κινηματογραφική εμφάνιση: καθώς μπαίνει στο viewport ξεθολώνει, φωτίζει και
 * «κάθεται» (scale→1) — σαν πλάνο που εστιάζει.
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
  /** Κινηματογραφικό overlay (ελαφρύ σβήσιμο στο σκοτάδι + διακριτική βινιέτα). */
  cinematic?: boolean;
  /** Αργό zoom/pan «Ken Burns» (ιδανικό για hero). */
  kenBurns?: boolean;
  /** Μαύρες μπάρες πάνω/κάτω (widescreen look). */
  letterbox?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Το hero (priority) φαίνεται αμέσως· τα υπόλοιπα εμφανίζονται στο scroll.
  const [revealed, setRevealed] = useState(priority);

  useEffect(() => {
    if (revealed) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRevealed(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [revealed]);

  if (!photo) {
    return <PlaceholderImage label={label} ratio={ratio} className={className} />;
  }
  return (
    <div
      ref={ref}
      className={`group relative ${ratio} overflow-hidden rounded-xl border border-bronze/15 bg-ink-900 transition-all duration-[1200ms] ease-out will-change-transform ${
        revealed ? "scale-100 opacity-100 blur-0" : "scale-[1.05] opacity-0 blur-[10px]"
      } ${className}`}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover brightness-[1.1] contrast-[1.04] saturate-[1.06] transition-transform duration-[1400ms] ease-out will-change-transform group-hover:scale-[1.09] ${
          kenBurns ? "animate-ken-burns" : ""
        }`}
      />
      {cinematic && (
        <>
          {/* Ελαφρύ σβήσιμο προς τα κάτω — κρατά τις φωτογραφίες φωτεινές */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/65 via-transparent to-transparent" />
          {/* Διακριτική βινιέτα */}
          <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.42)]" />
        </>
      )}
      {letterbox && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[6%] bg-ink-950" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[6%] bg-ink-950" />
        </>
      )}
    </div>
  );
}
