"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Κινηματογραφικό smooth scroll (Lenis) συγχρονισμένο με το GSAP ScrollTrigger.
 * - Σέβεται το prefers-reduced-motion: δεν ενεργοποιεί καθόλου το smooth scroll.
 * - Τα anchor links (#ypiresies κ.λπ.) κυλούν ομαλά με offset για το sticky header.
 * - Renders null — στήνει μόνο τη global συμπεριφορά στο window.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    // Οδηγούμε το Lenis από το GSAP ticker (ένα RAF loop για όλα)
    lenis.on("scroll", ScrollTrigger.update);
    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    // Ομαλό scroll σε anchor links της ίδιας σελίδας
    const headerOffset = -80;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest<HTMLAnchorElement>('a[href*="#"]');
      if (!target) return;
      const href = target.getAttribute("href") || "";
      const hashIndex = href.indexOf("#");
      if (hashIndex < 0) return;
      const path = href.slice(0, hashIndex);
      // Μόνο για links που δείχνουν στην τρέχουσα σελίδα
      if (path && path !== window.location.pathname && path !== "/") return;
      const id = href.slice(hashIndex + 1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: headerOffset });
      history.pushState(null, "", `#${id}`);
    };
    document.addEventListener("click", onClick);

    // Αν φορτώσει με hash, πήγαινε εκεί ομαλά
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) requestAnimationFrame(() => lenis.scrollTo(el, { offset: headerOffset, immediate: false }));
    }

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);

  return null;
}
