"use client";

import { useState } from "react";

/**
 * Χάρτης που φορτώνει ΚΑΤΟΠΙΝ ενέργειας χρήστη (καμία ενσωμάτωση τρίτων πριν
 * το κλικ — καλύτερη ιδιωτικότητα και απόδοση).
 */
export function MapReveal({
  embedUrl,
  directionsUrl,
}: {
  embedUrl: string;
  directionsUrl: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-bronze/15 bg-ink-900">
      {loaded ? (
        <iframe
          title="Χάρτης — ΤΟ ΚΟΥΡΕΙΟΝ 27"
          src={embedUrl}
          className="h-64 w-full sm:h-80"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-4 p-6 text-center sm:h-80">
          <p className="text-sm text-bone-muted">
            Ο χάρτης φορτώνει από το Google κατόπιν της δικής σας ενέργειας.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setLoaded(true)}
              className="rounded-full bg-bronze px-5 py-2.5 text-sm font-semibold text-ink-950 hover:bg-bronze-light"
            >
              Εμφάνιση χάρτη
            </button>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-bronze/40 px-5 py-2.5 text-sm font-semibold text-bronze-light hover:bg-bronze hover:text-ink-950"
            >
              Οδηγίες στο Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
