/** Μορφοποίηση τιμής/διάρκειας/ημερομηνίας σε ώρα Αθήνας (Intl / Hermes). */
const TZ = "Europe/Athens";

export function formatPrice(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined) return null;
  try {
    return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} €`;
  }
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min}′`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}ω` : `${h}ω ${m}′`;
}

export function fmtDateLong(iso: string): string {
  try {
    return new Intl.DateTimeFormat("el-GR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function fmtDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat("el-GR", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function fmtTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("el-GR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  } catch {
    return iso;
  }
}
