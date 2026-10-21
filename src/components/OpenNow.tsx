import { business, hasConfiguredHours, type DayHours } from "@/config/business";
import { athensParts, addDays, hmToMin, WEEKDAYS_EL } from "@/lib/datetime";

function hoursForDate(dateStr: string, weekday: number): DayHours {
  const holiday = business.holidays.find((h) => h.date === dateStr);
  if (holiday) {
    if (holiday.closed) return [];
    if (holiday.hours) return holiday.hours;
  }
  return business.hours[weekday] ?? [];
}

/**
 * Ένδειξη «Ανοιχτά τώρα» — εμφανίζεται ΜΟΝΟ όταν υπάρχει συμπληρωμένο ωράριο.
 * Ζώνη ώρας Europe/Athens, με συνυπολογισμό αργιών/εξαιρέσεων.
 */
export function OpenNow() {
  if (!hasConfiguredHours) return null;

  const now = new Date();
  const p = athensParts(now);
  const nowMin = p.hour * 60 + p.minute;

  const todayIntervals = hoursForDate(p.dateStr, p.weekday);
  const current = todayIntervals.find((iv) => hmToMin(iv.open) <= nowMin && nowMin < hmToMin(iv.close));

  if (current) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
        Ανοιχτά τώρα · έως {current.close}
      </span>
    );
  }

  // Εύρεση επόμενου ανοίγματος (έως 8 ημέρες μπροστά).
  let nextOpen: { dateStr: string; weekday: number; open: string } | null = null;
  for (let i = 0; i < 8; i++) {
    const dateStr = addDays(p.dateStr, i);
    const weekday = (p.weekday + i) % 7;
    const intervals = hoursForDate(dateStr, weekday);
    for (const iv of intervals) {
      if (i === 0 && hmToMin(iv.open) <= nowMin) continue; // πέρασε ήδη σήμερα
      nextOpen = { dateStr, weekday, open: iv.open };
      break;
    }
    if (nextOpen) break;
  }

  const label = nextOpen
    ? (() => {
        const dayWord =
          nextOpen.dateStr === p.dateStr
            ? "σήμερα"
            : nextOpen.dateStr === addDays(p.dateStr, 1)
              ? "αύριο"
              : WEEKDAYS_EL[nextOpen.weekday];
        return `Κλειστά · Ανοίγει ${dayWord} ${nextOpen.open}`;
      })()
    : "Κλειστά";

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-bronze/25 bg-ink-800 px-3 py-1 text-sm text-bone-muted">
      <span className="h-2 w-2 rounded-full bg-bone-dim" aria-hidden />
      {label}
    </span>
  );
}
