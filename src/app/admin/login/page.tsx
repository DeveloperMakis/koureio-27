"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Αποτυχία σύνδεσης.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Σφάλμα σύνδεσης. Δοκιμάστε ξανά.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-bone">Διαχείριση · Σύνδεση</h1>
      <p className="mt-2 text-sm text-bone-muted">Πρόσβαση μόνο για εξουσιοδοτημένο διαχειριστή.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm text-bone-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-bronze/20 bg-ink-950 px-4 py-3 text-bone outline-none focus:border-bronze"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm text-bone-muted">
            Κωδικός
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-bronze/20 bg-ink-950 px-4 py-3 text-bone outline-none focus:border-bronze"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-bronze px-6 py-3 text-base font-semibold text-ink-950 disabled:opacity-50"
        >
          {loading ? "Σύνδεση…" : "Σύνδεση"}
        </button>
      </form>
    </div>
  );
}
