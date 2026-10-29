"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const INTRO: Msg = {
  role: "assistant",
  content: "Γεια σου! 👋 Είμαι ο βοηθός κρατήσεων. Πες μου τι θέλεις — π.χ. «θέλω κούρεμα με τον Γιώργο στις 12 στις 13:00» — και το κλείνω.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([INTRO]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Στέλνουμε μόνο τα πραγματικά μηνύματα (όχι το intro).
        body: JSON.stringify({ messages: next.filter((m, i) => !(i === 0 && m === INTRO)) }),
      });
      const d = await r.json();
      setMessages((m) => [...m, { role: "assistant", content: d.reply || d.error || "Κάτι πήγε στραβά. Δοκίμασε ξανά." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Σφάλμα σύνδεσης. Δοκίμασε ξανά." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Κουμπί ανοίγματος */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Βοηθός κρατήσεων"
          className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-bronze px-4 py-3 text-sm font-semibold text-ink-950 shadow-lg transition-colors hover:bg-bronze-light sm:bottom-6"
        >
          <span aria-hidden>💬</span> Κλείσε με συνομιλία
        </button>
      )}

      {/* Πάνελ συνομιλίας */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[32rem] max-h-[80vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-bronze/25 bg-ink-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-bronze/15 bg-ink-950 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-bone">Βοηθός κρατήσεων</p>
              <p className="text-[0.7rem] text-bone-dim">ΤΟ ΚΟΥΡΕΙΟΝ 27</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Κλείσιμο" className="rounded-full px-2 py-1 text-bone-dim hover:text-bone">
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-bronze text-ink-950" : "border border-bronze/15 bg-ink-950 text-bone"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-bronze/15 bg-ink-950 px-3 py-2 text-sm text-bone-dim">…</div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-bronze/15 bg-ink-950 p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Γράψε το μήνυμά σου…"
              className="flex-1 rounded-full border border-bronze/20 bg-ink-900 px-4 py-2 text-sm text-bone outline-none focus:border-bronze"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-full bg-bronze px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-40"
            >
              →
            </button>
          </form>
        </div>
      )}
    </>
  );
}
