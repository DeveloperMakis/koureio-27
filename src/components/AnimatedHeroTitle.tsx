"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Κινηματογραφικό «split text» reveal για τον τίτλο του hero (στυλ React Bits).
 * Κάθε λέξη ανεβαίνει και ξεθολώνει με stagger (GSAP).
 * Σέβεται το prefers-reduced-motion: εμφανίζεται αμέσως, χωρίς κίνηση.
 */
export function AnimatedHeroTitle({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  const words = text.split(" ");

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const el = ref.current;
    if (!el) return;
    const spans = el.querySelectorAll<HTMLElement>("[data-word]");
    if (reduce) {
      gsap.set(spans, { opacity: 1, y: 0, filter: "blur(0px)" });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        spans,
        { opacity: 0, yPercent: 120, filter: "blur(12px)" },
        {
          opacity: 1,
          yPercent: 0,
          filter: "blur(0px)",
          duration: 1,
          ease: "power3.out",
          stagger: 0.12,
          delay: 0.1,
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <h1 ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <span data-word data-reveal className="inline-block opacity-0 will-change-transform">
            {w}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </h1>
  );
}
