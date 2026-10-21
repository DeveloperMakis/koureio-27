"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { WaitlistForm } from "@/components/booking/WaitlistForm";

/* ----------------------------- Τύποι ----------------------------- */
interface Service {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMin: number;
  durationLabel: string;
  priceCents: number | null;
  priceLabel: string | null;
  recommended: boolean;
}
interface Barber {
  id: string;
  name: string;
  photo?: string | null;
}
interface DateOption {
  value: string;
  weekdayShort: string;
  dayNum: number;
  monthShort: string;
  closed: boolean;
}
interface Phone {
  display: string;
  tel: string;
  label: string;
}
type StepKey = "service" | "barber" | "when" | "details";

interface Confirmation {
  code: string;
  manageUrl: string;
  icsUrl: string;
  startAtISO: string;
  serviceName: string;
  barberName: string;
  priceLabel: string | null;
  durationLabel: string;
  dateLabel: string;
  time: string;
  notifications: { email: string; sms: string };
}

/* --------------------------- Βοηθητικά --------------------------- */
function groupSlots(slots: string[]) {
  const g = { morning: [] as string[], noon: [] as string[], afternoon: [] as string[] };
  for (const t of slots) {
    const h = parseInt(t.slice(0, 2), 10);
    if (h < 12) g.morning.push(t);
    else if (h < 17) g.noon.push(t);
    else g.afternoon.push(t);
  }
  return g;
}
function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
/** Μορφοποίηση τιμής (client) — ίδια λογική με το money.ts. */
function fmtPrice(cents: number | null): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(cents / 100);
}
/** Μορφοποίηση διάρκειας (client) — ίδια λογική με το money.ts. */
function fmtDuration(min: number): string {
  if (min < 60) return `${min}′`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}ω` : `${h}ω ${m}′`;
}

/* ============================ Component ============================ */
export function BookingFlow({
  services,
  barbers,
  dates,
  initialServiceSlug,
  phone,
  selfCancelHours,
  mapsDirectionsUrl,
}: {
  services: Service[];
  barbers: Barber[];
  dates: DateOption[];
  initialServiceSlug?: string;
  phone: Phone | null;
  selfCancelHours: number;
  mapsDirectionsUrl: string;
}) {
  const multiBarber = barbers.length > 1;
  const steps: StepKey[] = multiBarber
    ? ["service", "barber", "when", "details"]
    : ["service", "when", "details"];

  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx];

  // Πολλαπλές υπηρεσίες ανά ραντεβού (σε σειρά επιλογής).
  const [serviceIds, setServiceIds] = useState<string[]>(
    () => {
      const s = services.find((x) => x.slug === initialServiceSlug);
      return s ? [s.id] : [];
    },
  );
  const [barberId, setBarberId] = useState<string | null>(null); // null = χωρίς προτίμηση
  const [chosenBarberName, setChosenBarberName] = useState<string | null>(
    () => (!multiBarber && barbers[0] ? barbers[0].name : null),
  );
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const [slots, setSlots] = useState<string[]>([]);
  const [slotsState, setSlotsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [findingFirst, setFindingFirst] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);

  const [name, setName] = useState("");
  const [cc, setCc] = useState("+30");
  const [national, setNational] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const idemRef = useRef<string>(uid());

  // Επιλεγμένες υπηρεσίες (σε σειρά) + αθροίσματα.
  const selectedServices = useMemo(
    () => serviceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as Service[],
    [services, serviceIds],
  );
  const hasService = selectedServices.length > 0;
  const totalDuration = selectedServices.reduce((n, s) => n + s.durationMin, 0);
  const anyPrice = selectedServices.some((s) => s.priceCents != null);
  const totalPriceCents = anyPrice ? selectedServices.reduce((n, s) => n + (s.priceCents ?? 0), 0) : null;
  const totalPriceLabel = fmtPrice(totalPriceCents);
  const totalDurationLabel = totalDuration > 0 ? fmtDuration(totalDuration) : null;
  const combinedName = selectedServices.map((s) => s.name).join(" + ");
  const serviceIdsKey = serviceIds.join(",");

  const selectedDateOption = useMemo(() => dates.find((d) => d.value === date) ?? null, [dates, date]);

  // Νέο idempotency key όταν αλλάζει η επιλογή (ώστε αλλαγή να μην μπλοκάρεται).
  useEffect(() => {
    idemRef.current = uid();
  }, [serviceIdsKey, barberId, date, time]);

  const fetchAvailability = useCallback(
    async (d: string, keepTime = false) => {
      if (serviceIds.length === 0) return;
      setSlotsState("loading");
      setShowWaitlist(false);
      const qs = new URLSearchParams({ serviceIds: serviceIds.join(","), date: d });
      if (barberId) qs.set("barberId", barberId);
      try {
        const r = await fetch(`/api/availability?${qs.toString()}`);
        const data = await r.json();
        const arr: string[] = Array.isArray(data.anySlots) ? data.anySlots : [];
        setSlots(arr);
        setSlotsState("ready");
        // Κράτα την ώρα μόνο αν παραμένει έγκυρη.
        if (keepTime && time && !arr.includes(time)) setTime(null);
      } catch {
        setSlotsState("error");
      }
    },
    [serviceIdsKey, barberId, time],
  );

  useEffect(() => {
    if (step === "when" && hasService && date) fetchAvailability(date, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, serviceIdsKey, barberId, date]);

  function goTo(key: StepKey) {
    setSubmitError(null);
    const i = steps.indexOf(key);
    if (i >= 0) setStepIdx(i);
  }
  function next() {
    setSubmitError(null);
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  }
  function back() {
    setSubmitError(null);
    setStepIdx((i) => Math.max(i - 1, 0));
  }

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setTime(null);
  }
  function selectBarber(id: string | null, nameLabel: string | null) {
    setBarberId(id);
    setChosenBarberName(id ? nameLabel : multiBarber ? null : barbers[0]?.name ?? null);
    setTime(null);
    next();
  }

  async function firstAvailable() {
    if (!hasService) return;
    setFindingFirst(true);
    try {
      const qs = new URLSearchParams({ serviceIds: serviceIds.join(",") });
      if (barberId) qs.set("barberId", barberId);
      const r = await fetch(`/api/availability/first?${qs.toString()}`);
      const data = await r.json();
      if (data.first) {
        setDate(data.first.dateStr);
        if (!barberId) setChosenBarberName(data.first.barberName);
        await fetchAvailability(data.first.dateStr);
        setTime(data.first.time);
      } else {
        setSlots([]);
        setSlotsState("ready");
      }
    } finally {
      setFindingFirst(false);
    }
  }

  async function nextAvailableDay() {
    if (!hasService || !date) return;
    setFindingFirst(true);
    try {
      const from = addDaysStr(date, 1);
      const qs = new URLSearchParams({ serviceIds: serviceIds.join(","), fromDate: from });
      if (barberId) qs.set("barberId", barberId);
      const r = await fetch(`/api/availability/first?${qs.toString()}`);
      const data = await r.json();
      if (data.first) {
        setDate(data.first.dateStr);
        if (!barberId) setChosenBarberName(data.first.barberName);
        await fetchAvailability(data.first.dateStr);
      }
    } finally {
      setFindingFirst(false);
    }
  }

  async function submit() {
    if (!hasService || !date || !time) return;
    setSubmitting(true);
    setSubmitError(null);
    const phoneValue = `${cc} ${national}`.trim();
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idemRef.current },
        body: JSON.stringify({
          serviceIds,
          barberId: barberId ?? undefined,
          date,
          time,
          customerName: name,
          customerPhone: phoneValue,
          customerEmail: email || undefined,
          notes: notes || undefined,
          website,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (res.status === 409) {
          setTime(null);
          goTo("when");
          if (date) fetchAvailability(date);
        }
        setSubmitError(data.error ?? "Κάτι πήγε στραβά. Δοκιμάστε ξανά.");
        return;
      }
      setConfirmation({
        code: data.code,
        manageUrl: data.manageUrl,
        icsUrl: data.icsUrl,
        startAtISO: data.startAtISO,
        serviceName: data.serviceName,
        barberName: data.barberName,
        priceLabel: totalPriceLabel,
        durationLabel: totalDurationLabel ?? fmtDuration(totalDuration),
        dateLabel: selectedDateOption
          ? `${selectedDateOption.weekdayShort} ${selectedDateOption.dayNum} ${selectedDateOption.monthShort}`
          : date,
        time: time,
        notifications: data.notifications ?? { email: "not_configured", sms: "not_configured" },
      });
    } catch {
      setSubmitError("Σφάλμα σύνδεσης. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.");
    } finally {
      setSubmitting(false);
    }
  }

  function rebookSame() {
    setConfirmation(null);
    setTime(null);
    setName("");
    setNational("");
    setEmail("");
    setNotes("");
    idemRef.current = uid();
    goTo("when");
  }

  const barberLabel = barberId ? chosenBarberName : chosenBarberName ?? "Χωρίς προτίμηση";

  if (confirmation) {
    return (
      <ConfirmationCard c={confirmation} phone={phone} mapsUrl={mapsDirectionsUrl} onRebook={rebookSame} />
    );
  }

  // Μπορεί να προχωρήσει στο τρέχον βήμα;
  const canContinue =
    (step === "service" && hasService) ||
    step === "barber" ||
    (step === "when" && !!time) ||
    step === "details";

  // Πρωτεύουσα ενέργεια ανά βήμα (ίδια σε δεξιά σύνοψη & mobile μπάρα).
  function primaryAction() {
    if (step === "service") {
      if (hasService) next();
    } else if (step === "when") next();
    else if (step === "details") submit();
  }

  /* ----- Σύνοψη (σταθερή δεξιά σε desktop, inline σε mobile) ----- */
  const summary = (
    <Summary
      serviceName={combinedName || null}
      serviceCount={selectedServices.length}
      durationLabel={totalDurationLabel}
      priceLabel={totalPriceLabel}
      barberLabel={step === "service" ? null : barberLabel}
      dateLabel={selectedDateOption ? `${selectedDateOption.weekdayShort} ${selectedDateOption.dayNum} ${selectedDateOption.monthShort}` : null}
      time={time}
      multiBarber={multiBarber}
      onChange={(k) => goTo(k)}
      step={step}
      canContinue={canContinue}
      submitting={submitting}
      onPrimary={primaryAction}
    />
  );

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:gap-8">
      {/* Κύρια ροή — min-w-0 ώστε η στήλη να μη «φουσκώνει» από τη λωρίδα ημερών. */}
      <div className="min-w-0 pb-6 md:pb-0">
        <Stepper steps={steps} current={stepIdx} />

        {step === "service" && (
          <ServiceStep
            services={services}
            selectedIds={serviceIds}
            onToggle={toggleService}
            onContinue={() => hasService && next()}
          />
        )}

        {step === "barber" && (
          <BarberStep
            barbers={barbers}
            selectedId={barberId}
            onSelect={selectBarber}
            onBack={back}
          />
        )}

        {step === "when" && hasService && (
          <WhenStep
            dates={dates}
            date={date}
            time={time}
            slots={slots}
            slotsState={slotsState}
            findingFirst={findingFirst}
            showWaitlist={showWaitlist}
            serviceIds={serviceIds}
            barberId={barberId}
            onPickDate={(d) => {
              setDate(d);
              setTime(null);
            }}
            onPickTime={setTime}
            onFirstAvailable={firstAvailable}
            onNextDay={nextAvailableDay}
            onOpenWaitlist={() => setShowWaitlist(true)}
            onBack={back}
            onContinue={next}
          />
        )}

        {step === "details" && hasService && (
          <DetailsStep
            serviceName={combinedName}
            durationLabel={totalDurationLabel ?? fmtDuration(totalDuration)}
            priceLabel={totalPriceLabel}
            barberLabel={barberLabel}
            multiBarber={multiBarber}
            dateLabel={selectedDateOption ? `${selectedDateOption.weekdayShort} ${selectedDateOption.dayNum} ${selectedDateOption.monthShort}` : date ?? ""}
            time={time}
            selfCancelHours={selfCancelHours}
            values={{ name, cc, national, email, notes, website }}
            setters={{ setName, setCc, setNational, setEmail, setNotes, setWebsite }}
            submitting={submitting}
            submitError={submitError}
            onBack={back}
            onSubmit={submit}
          />
        )}
      </div>

      {/* Σύνοψη δεξιά (desktop/tablet) */}
      <aside className="hidden md:block">
        <div className="sticky top-24">{summary}</div>
      </aside>
    </div>
  );
}

/* --------------------------- Υποστοιχεία --------------------------- */

function addDaysStr(dateStr: string, n: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function Stepper({ steps, current }: { steps: StepKey[]; current: number }) {
  const labels: Record<StepKey, string> = {
    service: "Υπηρεσία",
    barber: "Κουρέας",
    when: "Ημέρα & ώρα",
    details: "Στοιχεία",
  };
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" aria-label="Στάδια κράτησης">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={`grid h-6 w-6 place-items-center rounded-full text-[0.7rem] font-semibold ${
              i <= current ? "bg-bronze text-ink-950" : "bg-ink-800 text-bone-dim"
            }`}
          >
            {i + 1}
          </span>
          <span className={i === current ? "text-bone" : "text-bone-dim"}>{labels[s]}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-4 bg-bronze/20" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function ServiceStep({
  services,
  selectedIds,
  onToggle,
  onContinue,
}: {
  services: Service[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <fieldset>
      <legend className="text-xl font-semibold text-bone">Τι θα κάνουμε σήμερα;</legend>
      <p className="mt-1 text-sm text-bone-muted">Μπορείς να διαλέξεις περισσότερες από μία (π.χ. κούρεμα + ξύρισμα).</p>
      <div className="mt-4 grid gap-3">
        {services.map((s) => {
          const checked = selectedIds.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={checked}
              onClick={() => onToggle(s.id)}
              className={`flex items-center justify-between gap-4 rounded-2xl border p-5 text-left transition-colors ${
                checked ? "border-bronze bg-bronze/10" : "border-bronze/15 bg-ink-900 hover:border-bronze/40"
              }`}
            >
              <span className="flex items-start gap-3">
                {/* Ένδειξη επιλογής (checkbox) */}
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[0.7rem] ${
                    checked ? "border-bronze bg-bronze text-ink-950" : "border-bronze/40 text-transparent"
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
                <span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-bone">{s.name}</span>
                    {s.recommended && (
                      <span className="rounded-full bg-bronze/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-bronze-light">
                        Προτεινόμενη
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-bone-muted">{s.description}</span>
                  <span className="mt-2 block text-xs uppercase tracking-widest text-bone-dim">{s.durationLabel}</span>
                </span>
              </span>
              {s.priceLabel && (
                <span className="shrink-0 rounded-full bg-bronze/10 px-3 py-1 text-sm font-semibold text-bronze-light">
                  {s.priceLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Κουμπί συνέχειας — πάντα ορατό σε κάθε πλάτος. */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={onContinue}
          className="rounded-full bg-bronze px-7 py-3 text-base font-semibold text-ink-950 transition-colors hover:bg-bronze-light disabled:opacity-40"
        >
          Συνέχεια
        </button>
      </div>
    </fieldset>
  );
}

function BarberStep({
  barbers,
  selectedId,
  onSelect,
  onBack,
}: {
  barbers: Barber[];
  selectedId: string | null;
  onSelect: (id: string | null, name: string | null) => void;
  onBack: () => void;
}) {
  return (
    <fieldset>
      <legend className="text-xl font-semibold text-bone">Με ποιον θέλεις;</legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect(null, null)}
          className={`rounded-2xl border p-5 text-left transition-colors ${
            selectedId === null ? "border-bronze bg-bronze/10" : "border-bronze/15 bg-ink-900 hover:border-bronze/40"
          }`}
        >
          <span className="block font-semibold text-bone">Πρώτος διαθέσιμος</span>
          <span className="mt-1 block text-sm text-bone-muted">Χωρίς προτίμηση</span>
        </button>
        {barbers.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b.id, b.name)}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
              selectedId === b.id ? "border-bronze bg-bronze/10" : "border-bronze/15 bg-ink-900 hover:border-bronze/40"
            }`}
          >
            {b.photo ? (
              <Image src={b.photo} alt={b.name} width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-800 font-display text-bronze">
                {b.name.slice(0, 1)}
              </span>
            )}
            <span className="font-semibold text-bone">{b.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        <BackButton onClick={onBack} />
      </div>
    </fieldset>
  );
}

function WhenStep(props: {
  dates: DateOption[];
  date: string | null;
  time: string | null;
  slots: string[];
  slotsState: "idle" | "loading" | "ready" | "error";
  findingFirst: boolean;
  showWaitlist: boolean;
  serviceIds: string[];
  barberId: string | null;
  onPickDate: (d: string) => void;
  onPickTime: (t: string) => void;
  onFirstAvailable: () => void;
  onNextDay: () => void;
  onOpenWaitlist: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { dates, date, time, slots, slotsState, findingFirst } = props;
  const today = dates[0]?.value;
  const tomorrow = dates[1]?.value;
  const grouped = groupSlots(slots);
  const stripRef = useRef<HTMLDivElement>(null);

  function scrollDays(dir: 1 | -1) {
    stripRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-bone">Πότε σε βολεύει;</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={props.onFirstAvailable}
          disabled={findingFirst}
          className="rounded-full bg-bronze px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-bronze-light disabled:opacity-50"
        >
          {findingFirst ? "Αναζήτηση…" : "⚡ Πρώτο διαθέσιμο"}
        </button>
        {today && (
          <button
            type="button"
            onClick={() => props.onPickDate(today)}
            className={`rounded-full border px-4 py-2 text-sm ${date === today ? "border-bronze text-bone" : "border-bronze/25 text-bone-muted hover:text-bone"}`}
          >
            Σήμερα
          </button>
        )}
        {tomorrow && (
          <button
            type="button"
            onClick={() => props.onPickDate(tomorrow)}
            className={`rounded-full border px-4 py-2 text-sm ${date === tomorrow ? "border-bronze text-bone" : "border-bronze/25 text-bone-muted hover:text-bone"}`}
          >
            Αύριο
          </button>
        )}
      </div>

      {/* Λωρίδα ημερών με βελάκια πλοήγησης (για μεταγενέστερες μέρες) */}
      <div className="relative mt-4">
        <button
          type="button"
          onClick={() => scrollDays(-1)}
          aria-label="Προηγούμενες ημέρες"
          className="absolute left-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-bronze/30 bg-ink-950/90 text-bone backdrop-blur hover:bg-ink-900"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => scrollDays(1)}
          aria-label="Επόμενες ημέρες"
          className="absolute right-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-bronze/30 bg-ink-950/90 text-bone backdrop-blur hover:bg-ink-900"
        >
          ›
        </button>
        <div
          ref={stripRef}
          className="flex gap-2 overflow-x-auto scroll-smooth px-11 pb-2 no-scrollbar"
          role="listbox"
          aria-label="Ημερομηνία"
        >
        {dates.map((d) => {
          const active = date === d.value;
          return (
            <button
              key={d.value}
              type="button"
              disabled={d.closed}
              aria-selected={active}
              onClick={() => props.onPickDate(d.value)}
              className={`flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-2 text-sm transition-colors ${
                d.closed
                  ? "cursor-not-allowed border-bronze/5 text-bone-dim/40"
                  : active
                    ? "border-bronze bg-bronze/10 text-bone"
                    : "border-bronze/15 bg-ink-900 text-bone-muted hover:border-bronze/40"
              }`}
            >
              <span className="text-xs uppercase">{d.weekdayShort}</span>
              <span className="text-lg font-semibold">{d.dayNum}</span>
              <span className="text-[0.65rem] text-bone-dim">{d.monthShort}</span>
            </button>
          );
        })}
        </div>
      </div>

      {/* Ώρες */}
      <div className="mt-5 min-h-[6rem]">
        {!date && <p className="text-sm text-bone-muted">Επίλεξε ημέρα ή πάτησε «Πρώτο διαθέσιμο».</p>}
        {date && slotsState === "loading" && <p className="animate-pulse text-sm text-bone-muted">Έλεγχος διαθεσιμότητας…</p>}
        {date && slotsState === "error" && <p className="text-sm text-red-300">Σφάλμα ελέγχου. Δοκιμάστε ξανά.</p>}
        {date && slotsState === "ready" && slots.length === 0 && !props.showWaitlist && (
          <div className="rounded-2xl border border-bronze/15 bg-ink-900 p-5">
            <p className="text-sm text-bone">Δεν υπάρχει διαθέσιμη ώρα για αυτή την ημέρα.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={props.onNextDay}
                disabled={findingFirst}
                className="rounded-full bg-bronze px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-50"
              >
                Επόμενη διαθέσιμη ημέρα
              </button>
              <button
                type="button"
                onClick={props.onOpenWaitlist}
                className="rounded-full border border-bronze/40 px-4 py-2 text-sm font-semibold text-bronze-light hover:bg-bronze hover:text-ink-950"
              >
                Λίστα αναμονής
              </button>
            </div>
          </div>
        )}
        {date && slotsState === "ready" && props.showWaitlist && slots.length === 0 && (
          <WaitlistInline serviceId={props.serviceIds[0]} barberId={props.barberId} date={date} />
        )}
        {date && slotsState === "ready" && slots.length > 0 && (
          <div className="space-y-4">
            <SlotGroup title="Πρωί" times={grouped.morning} selected={time} onPick={props.onPickTime} />
            <SlotGroup title="Μεσημέρι" times={grouped.noon} selected={time} onPick={props.onPickTime} />
            <SlotGroup title="Απόγευμα" times={grouped.afternoon} selected={time} onPick={props.onPickTime} />
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <BackButton onClick={props.onBack} />
        <button
          type="button"
          disabled={!time}
          onClick={props.onContinue}
          className="rounded-full bg-bronze px-7 py-3 text-base font-semibold text-ink-950 transition-colors hover:bg-bronze-light disabled:opacity-40"
        >
          Συνέχεια
        </button>
      </div>
    </div>
  );
}

function SlotGroup({ title, times, selected, onPick }: { title: string; times: string[]; selected: string | null; onPick: (t: string) => void }) {
  if (times.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-bone-dim">{title}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {times.map((t) => (
          <button
            key={t}
            type="button"
            aria-selected={selected === t}
            onClick={() => onPick(t)}
            className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
              selected === t ? "border-bronze bg-bronze text-ink-950" : "border-bronze/20 bg-ink-900 text-bone hover:border-bronze/50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function WaitlistInline({ serviceId, barberId, date }: { serviceId: string; barberId: string | null; date: string }) {
  return <WaitlistForm serviceId={serviceId} barberId={barberId} defaultDate={date} />;
}

function DetailsStep(props: {
  serviceName: string;
  durationLabel: string;
  priceLabel: string | null;
  barberLabel: string | null;
  multiBarber: boolean;
  dateLabel: string;
  time: string | null;
  selfCancelHours: number;
  values: { name: string; cc: string; national: string; email: string; notes: string; website: string };
  setters: {
    setName: (v: string) => void;
    setCc: (v: string) => void;
    setNational: (v: string) => void;
    setEmail: (v: string) => void;
    setNotes: (v: string) => void;
    setWebsite: (v: string) => void;
  };
  submitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const { values: v, setters: s } = props;
  const input = "w-full rounded-lg border border-bronze/20 bg-ink-950 px-4 py-3 text-bone outline-none focus:border-bronze";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit();
      }}
    >
      <h2 className="text-xl font-semibold text-bone">Τα στοιχεία σου και είσαι έτοιμος</h2>

      <dl className="mt-4 space-y-1 rounded-2xl border border-bronze/15 bg-ink-900 p-5 text-sm">
        <Row label="Υπηρεσία" value={props.serviceName} />
        {props.multiBarber && <Row label="Κουρέας" value={props.barberLabel ?? "Χωρίς προτίμηση"} />}
        <Row label="Ημέρα & ώρα" value={`${props.dateLabel} · ${props.time}`} />
        <Row label="Διάρκεια" value={props.durationLabel} />
        {props.priceLabel && <Row label="Τιμή" value={props.priceLabel} />}
        <Row label="Πληρωμή" value="Στο κατάστημα" />
      </dl>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="b-name" className="mb-1.5 block text-sm text-bone-muted">Όνομα *</label>
          <input id="b-name" required autoComplete="name" value={v.name} onChange={(e) => s.setName(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="b-phone" className="mb-1.5 block text-sm text-bone-muted">Κινητό *</label>
          <div className="flex gap-2">
            <select aria-label="Κωδικός χώρας" value={v.cc} onChange={(e) => s.setCc(e.target.value)} className="rounded-lg border border-bronze/20 bg-ink-950 px-2 text-bone outline-none focus:border-bronze">
              <option value="+30">🇬🇷 +30</option>
              <option value="+357">🇨🇾 +357</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+49">🇩🇪 +49</option>
              <option value="+1">🇺🇸 +1</option>
            </select>
            <input id="b-phone" required inputMode="tel" autoComplete="tel-national" placeholder="69xxxxxxxx" value={v.national} onChange={(e) => s.setNational(e.target.value)} className={input} />
          </div>
        </div>
        <div>
          <label htmlFor="b-email" className="mb-1.5 block text-sm text-bone-muted">Email (προαιρετικό)</label>
          <input id="b-email" type="email" autoComplete="email" value={v.email} onChange={(e) => s.setEmail(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="b-notes" className="mb-1.5 block text-sm text-bone-muted">Σημείωση (προαιρετικό)</label>
          <textarea id="b-notes" rows={2} value={v.notes} onChange={(e) => s.setNotes(e.target.value)} className={input} />
        </div>
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <input tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => s.setWebsite(e.target.value)} />
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-bronze/15 bg-ink-900 px-4 py-3 text-xs text-bone-muted">
        Ακύρωση έως {props.selfCancelHours} ώρες πριν, μέσω του συνδέσμου διαχείρισης. Με την επιβεβαίωση
        αποδέχεσαι τους{" "}
        <Link href="/oroi" className="underline hover:text-bone">όρους</Link> και την{" "}
        <Link href="/aporrito" className="underline hover:text-bone">πολιτική απορρήτου</Link>.
      </p>

      {props.submitError && (
        <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {props.submitError}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <BackButton onClick={props.onBack} />
        <button
          type="submit"
          disabled={props.submitting}
          className="rounded-full bg-bronze px-7 py-3 text-base font-semibold text-ink-950 transition-colors hover:bg-bronze-light disabled:opacity-50"
        >
          {props.submitting ? "Γίνεται κράτηση…" : "Επιβεβαίωση ραντεβού"}
        </button>
      </div>
    </form>
  );
}

function Summary({
  serviceName,
  serviceCount,
  durationLabel,
  priceLabel,
  barberLabel,
  dateLabel,
  time,
  multiBarber,
  onChange,
  step,
  canContinue,
  submitting,
  onPrimary,
}: {
  serviceName: string | null;
  serviceCount: number;
  durationLabel: string | null;
  priceLabel: string | null;
  barberLabel: string | null;
  dateLabel: string | null;
  time: string | null;
  multiBarber: boolean;
  onChange: (k: StepKey) => void;
  step: StepKey;
  canContinue: boolean;
  submitting: boolean;
  onPrimary: () => void;
}) {
  // Το δεξί panel έχει πάντα ορατή πρωτεύουσα ενέργεια (εκτός «κουρέα» που προχωρά αυτόματα).
  const showCta = step === "service" || step === "when" || step === "details";
  const ctaLabel = step === "details" ? (submitting ? "Γίνεται κράτηση…" : "Επιβεβαίωση ραντεβού") : "Συνέχεια";
  const serviceLabel = serviceCount > 1 ? `Υπηρεσίες (${serviceCount})` : "Υπηρεσία";
  return (
    <div className="rounded-2xl border border-bronze/15 bg-ink-900 p-5">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-bronze">Σύνοψη</p>
      <ul className="space-y-3 text-sm">
        <SummaryItem label={serviceLabel} value={serviceName ?? "—"} onChange={serviceName ? () => onChange("service") : undefined} />
        {multiBarber && <SummaryItem label="Κουρέας" value={barberLabel ?? "—"} onChange={barberLabel ? () => onChange("barber") : undefined} />}
        <SummaryItem label="Ημέρα & ώρα" value={dateLabel && time ? `${dateLabel} · ${time}` : "—"} onChange={serviceName ? () => onChange("when") : undefined} />
        <SummaryItem label="Διάρκεια" value={durationLabel ?? "—"} />
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-bronze/10 pt-4">
        <span className="text-sm text-bone-muted">Σύνολο</span>
        <span className="font-display text-xl font-semibold text-bone">{priceLabel ?? "—"}</span>
      </div>
      <p className="mt-1 text-xs text-bone-dim">Πληρωμή στο κατάστημα</p>
      {showCta && (
        <button
          type="button"
          disabled={!canContinue || submitting}
          onClick={onPrimary}
          className="mt-4 w-full rounded-full bg-bronze px-6 py-3 text-base font-semibold text-ink-950 transition-colors hover:bg-bronze-light disabled:opacity-40"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function SummaryItem({ label, value, onChange }: { label: string; value: string; onChange?: () => void }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <div>
        <p className="text-bone-dim">{label}</p>
        <p className="font-medium text-bone">{value}</p>
      </div>
      {onChange && (
        <button type="button" onClick={onChange} className="shrink-0 text-xs text-bronze-light underline hover:text-bronze">
          Αλλαγή
        </button>
      )}
    </li>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full border border-bronze/25 px-5 py-3 text-sm font-medium text-bone-muted hover:text-bone">
      ← Πίσω
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-bone-dim">{label}</dt>
      <dd className="font-medium text-bone">{value}</dd>
    </div>
  );
}

function ConfirmationCard({
  c,
  phone,
  mapsUrl,
  onRebook,
}: {
  c: Confirmation;
  phone: Phone | null;
  mapsUrl: string;
  onRebook: () => void;
}) {
  const emailOk = c.notifications.email === "configured";
  const smsOk = c.notifications.sms === "configured";
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-6 text-center sm:p-8">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-2xl text-emerald-300">✓</div>
      <h2 className="mt-4 font-display text-2xl font-semibold text-bone">Το ραντεβού σου έκλεισε!</h2>
      <p className="mt-2 text-sm text-bone-muted">Κωδικός: <span className="font-semibold text-bone">{c.code}</span></p>

      <dl className="mx-auto mt-6 max-w-sm space-y-1 rounded-xl border border-bronze/15 bg-ink-900 p-5 text-left text-sm">
        <Row label="Υπηρεσία" value={c.serviceName} />
        <Row label="Κουρέας" value={c.barberName} />
        <Row label="Ημέρα & ώρα" value={`${c.dateLabel} · ${c.time}`} />
        <Row label="Διάρκεια" value={c.durationLabel} />
        {c.priceLabel && <Row label="Τιμή" value={c.priceLabel} />}
        <Row label="Πληρωμή" value="Στο κατάστημα" />
      </dl>

      {/* Ακριβής κατάσταση ειδοποιήσεων */}
      <p className="mx-auto mt-3 max-w-sm text-xs text-bone-dim">
        {emailOk || smsOk
          ? "Θα λάβεις επιβεβαίωση σύντομα."
          : "Επιβεβαίωση email/SMS: δεν έχει ρυθμιστεί ακόμη πάροχος — κράτησε τον κωδικό και τον σύνδεσμο διαχείρισης."}
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <a href={c.icsUrl} className="w-full max-w-xs rounded-full bg-bronze px-6 py-3 text-sm font-semibold text-ink-950 hover:bg-bronze-light">
          Προσθήκη στο ημερολόγιο (.ics)
        </a>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="w-full max-w-xs rounded-full border border-bronze/40 px-6 py-3 text-sm font-semibold text-bronze-light hover:bg-bronze hover:text-ink-950">
          Οδηγίες για το κατάστημα
        </a>
        <Link href={c.manageUrl} className="w-full max-w-xs rounded-full border border-bronze/25 px-6 py-3 text-sm font-semibold text-bone-muted hover:text-bone">
          Διαχείριση / ακύρωση
        </Link>
        <button type="button" onClick={onRebook} className="text-sm text-bronze-light underline hover:text-bronze">
          Κλείσε ξανά την ίδια υπηρεσία
        </button>
      </div>

      {phone && (
        <p className="mt-6 text-xs text-bone-dim">
          Για αλλαγές, καλέστε μας στο{" "}
          <a href={`tel:${phone.tel}`} className="underline hover:text-bone">{phone.display}</a>.
        </p>
      )}
    </div>
  );
}
