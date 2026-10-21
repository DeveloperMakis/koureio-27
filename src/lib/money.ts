/** Μορφοποίηση τιμής από cents σε ελληνικό ευρώ, π.χ. 1200 → «12,00 €». null → null. */
export function formatPrice(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined) return null;
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** Μορφοποίηση διάρκειας, π.χ. 50 → «50′», 90 → «1ω 30′». */
export function formatDuration(min: number): string {
  if (min < 60) return `${min}′`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}ω` : `${h}ω ${m}′`;
}
