"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Img {
  id: string;
  url: string;
}

export function PhotoUploader({
  slot,
  label,
  hint,
  multiple = false,
  current,
}: {
  slot: string;
  label: string;
  hint?: string;
  multiple?: boolean;
  current: Img[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("slot", slot);
      fd.append("file", file);
      const r = await fetch("/api/admin/photos", { method: "POST", body: fd });
      const d = await r.json();
      if (!d.ok) setMsg(d.error || "Αποτυχία ανεβάσματος.");
      else router.refresh();
    } catch {
      setMsg("Σφάλμα σύνδεσης.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/photos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-bronze/15 bg-ink-900 p-5">
      <h2 className="font-semibold text-bone">{label}</h2>
      {hint && <p className="mt-1 text-sm text-bone-muted">{hint}</p>}

      {current.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {current.map((img) => (
            <div key={img.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-28 w-28 rounded-lg border border-bronze/20 object-cover" />
              <button
                type="button"
                onClick={() => remove(img.id)}
                disabled={busy}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-red-500/50 bg-ink-950 text-xs text-red-200 hover:bg-red-500/20"
                aria-label="Διαγραφή"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-bronze px-5 py-2 text-sm font-semibold text-ink-950 hover:bg-bronze-light">
        {busy ? "Ανέβασμα…" : current.length > 0 && !multiple ? "Αντικατάσταση" : "➕ Ανέβασμα φωτογραφίας"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </label>

      {msg && <p className="mt-2 text-sm text-red-300">{msg}</p>}
      <p className="mt-2 text-xs text-bone-dim">JPG/PNG/WebP έως 8MB.</p>
    </div>
  );
}
