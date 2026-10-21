import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen, H1, H2, Muted, Eyebrow, Card, Button, Pill, Loading, ErrorState, EmptyState } from "@/ui";
import { apiJson, ApiError } from "@/api";
import { useAuth } from "@/auth";
import { colors, radius, sp } from "@/theme";
import { formatPrice, formatDuration, fmtDateLong } from "@/format";

const TZ = "Europe/Athens";
function athensToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(d: string, n: number): string {
  const [y, mo, da] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
function weekdayOf(d: string): number {
  const [y, mo, da] = d.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, da, 12)).getUTCDay();
}
const WD = ["Κυρ", "Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"];
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
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

interface Catalog {
  services: { id: string; slug: string; name: string; description: string; durationMin: number; durationLabel: string; priceCents: number | null; priceLabel: string | null; recommended: boolean }[];
  barbers: { id: string; name: string }[];
  business: { hours: Record<string, { open: string; close: string }[]> };
}

export default function BookingScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { customer } = useAuth();
  const params = useLocalSearchParams<{ service?: string }>();

  const catalog = useQuery({ queryKey: ["catalog"], queryFn: () => apiJson<Catalog>("/api/v1/catalog") });

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null); // null = χωρίς προτίμηση
  const [chosenBarber, setChosenBarber] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsState, setSlotsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [step, setStep] = useState<"service" | "barber" | "when" | "confirm">("service");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);
  const idem = useRef(uid());

  const services = catalog.data?.services ?? [];
  const barbers = catalog.data?.barbers ?? [];
  const multiBarber = barbers.length > 1;
  const service = services.find((s) => s.id === serviceId) ?? null;

  // Προεπιλογή υπηρεσίας από param
  useEffect(() => {
    if (params.service && services.length && !serviceId) {
      const s = services.find((x) => x.slug === params.service);
      if (s) setServiceId(s.id);
    }
    if (!multiBarber && barbers[0]) setChosenBarber(barbers[0].name);
  }, [params.service, services.length]);

  useEffect(() => {
    idem.current = uid();
  }, [serviceId, barberId, date, time]);

  const dates = useMemo(() => {
    const today = athensToday();
    const hours = catalog.data?.business.hours ?? {};
    return Array.from({ length: 22 }).map((_, i) => {
      const value = addDays(today, i);
      const wd = weekdayOf(value);
      return { value, wd: WD[wd], day: Number(value.split("-")[2]), closed: (hours[String(wd)] ?? []).length === 0 };
    });
  }, [catalog.data]);

  async function loadSlots(d: string) {
    if (!serviceId) return;
    setSlotsState("loading");
    try {
      const data = await apiJson<{ anySlots: string[] }>(`/api/availability?serviceId=${serviceId}&date=${d}${barberId ? `&barberId=${barberId}` : ""}`);
      setSlots(data.anySlots ?? []);
      setSlotsState("ready");
    } catch {
      setSlotsState("error");
    }
  }

  async function firstAvailable() {
    if (!serviceId) return;
    setSlotsState("loading");
    try {
      const data = await apiJson<{ first: { dateStr: string; time: string; barberName: string } | null }>(`/api/availability/first?serviceId=${serviceId}${barberId ? `&barberId=${barberId}` : ""}`);
      if (data.first) {
        setDate(data.first.dateStr);
        if (!barberId) setChosenBarber(data.first.barberName);
        await loadSlots(data.first.dateStr);
        setTime(data.first.time);
      } else {
        setSlots([]);
        setSlotsState("ready");
      }
    } catch {
      setSlotsState("error");
    }
  }

  function pickService(id: string) {
    setServiceId(id);
    setTime(null);
    setStep(multiBarber ? "barber" : "when");
  }
  function pickBarber(id: string | null, name: string | null) {
    setBarberId(id);
    setChosenBarber(id ? name : multiBarber ? null : barbers[0]?.name ?? null);
    setTime(null);
    setStep("when");
  }

  async function confirm() {
    if (!service || !date || !time) return;
    if (!customer) {
      router.push("/login");
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiJson<any>("/api/v1/bookings", {
        method: "POST",
        headers: { "Idempotency-Key": idem.current },
        body: { serviceId: service.id, barberId: barberId ?? undefined, date, time },
      });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread"] });
      setConfirmation(data);
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "SLOT_TAKEN") {
        Alert.alert("Η ώρα καλύφθηκε", "Διάλεξε μία από τις παρακάτω διαθέσιμες.");
        setTime(null);
        setStep("when");
        if (date) loadSlots(date);
      } else {
        Alert.alert("Δεν έγινε η κράτηση", err.message ?? "Δοκίμασε ξανά.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (catalog.isLoading) return <Screen><Loading text="Φόρτωση…" /></Screen>;
  if (catalog.isError) return <Screen><ErrorState text="Δεν φόρτωσε ο κατάλογος." onRetry={() => catalog.refetch()} /></Screen>;

  if (confirmation) {
    return (
      <Screen>
        <Card style={{ alignItems: "center", gap: sp(2), borderColor: "rgba(83,192,138,0.4)" }}>
          <Text style={{ fontSize: 40 }}>✓</Text>
          <H1>Το ραντεβού σου έκλεισε!</H1>
          <Muted>Κωδικός: {confirmation.code}</Muted>
        </Card>
        <Card style={{ gap: sp(1.5) }}>
          <Row k="Υπηρεσία" v={confirmation.serviceName} />
          <Row k="Κουρέας" v={confirmation.barberName} />
          <Row k="Ημέρα & ώρα" v={`${fmtDateLong(confirmation.startAtISO)} · ${time}`} />
          {formatPrice(confirmation.priceCents) && <Row k="Τιμή" v={formatPrice(confirmation.priceCents)!} />}
          <Row k="Πληρωμή" v="Στο κατάστημα" />
        </Card>
        <Button title="Τα ραντεβού μου" onPress={() => router.replace("/bookings")} />
        <Button
          title="Κλείσε ξανά"
          variant="secondary"
          onPress={() => {
            setConfirmation(null);
            setTime(null);
            idem.current = uid();
            setStep("when");
          }}
        />
      </Screen>
    );
  }

  const grouped = groupSlots(slots);

  return (
    <Screen>
      {/* Στάδια */}
      <View style={{ flexDirection: "row", gap: sp(2), flexWrap: "wrap" }}>
        {(multiBarber ? ["service", "barber", "when", "confirm"] : ["service", "when", "confirm"]).map((s, i) => (
          <Text key={s} style={{ color: s === step ? colors.gold : colors.dim, fontSize: 12, fontWeight: "700" }}>
            {i + 1}. {s === "service" ? "Υπηρεσία" : s === "barber" ? "Κουρέας" : s === "when" ? "Ώρα" : "Σύνοψη"}
          </Text>
        ))}
      </View>

      {step === "service" && (
        <>
          <H2>Τι θα κάνουμε σήμερα;</H2>
          {services.map((s) => (
            <Card key={s.id} selected={serviceId === s.id} onPress={() => pickService(s.id)}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp(2) }}>
                    <Text style={styles.name}>{s.name}</Text>
                    {s.recommended && <Text style={styles.reco}>Προτεινόμενη</Text>}
                  </View>
                  <Muted>{s.description}</Muted>
                  <Muted style={{ color: colors.dim }}>{formatDuration(s.durationMin)}</Muted>
                </View>
                {s.priceLabel && <Text style={styles.price}>{s.priceLabel}</Text>}
              </View>
            </Card>
          ))}
        </>
      )}

      {step === "barber" && (
        <>
          <H2>Με ποιον θέλεις;</H2>
          <Card selected={barberId === null} onPress={() => pickBarber(null, null)}>
            <Text style={styles.name}>Πρώτος διαθέσιμος</Text>
            <Muted>Χωρίς προτίμηση</Muted>
          </Card>
          {barbers.map((b) => (
            <Card key={b.id} selected={barberId === b.id} onPress={() => pickBarber(b.id, b.name)}>
              <Text style={styles.name}>{b.name}</Text>
            </Card>
          ))}
          <Button title="← Πίσω" variant="ghost" onPress={() => setStep("service")} />
        </>
      )}

      {step === "when" && service && (
        <>
          <H2>Πότε σε βολεύει;</H2>
          <Button title="⚡ Πρώτο διαθέσιμο" variant="secondary" onPress={firstAvailable} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: sp(2), paddingVertical: sp(1) }}>
            {dates.map((d) => (
              <Pressable
                key={d.value}
                disabled={d.closed}
                onPress={() => {
                  setDate(d.value);
                  setTime(null);
                  loadSlots(d.value);
                }}
                style={[styles.day, date === d.value && styles.daySel, d.closed && { opacity: 0.3 }]}
              >
                <Text style={[styles.dayWd, date === d.value && { color: colors.ink950 }]}>{d.wd}</Text>
                <Text style={[styles.dayNum, date === d.value && { color: colors.ink950 }]}>{d.day}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {!date && <Muted>Διάλεξε ημέρα ή πάτησε «Πρώτο διαθέσιμο».</Muted>}
          {date && slotsState === "loading" && <Loading text="Έλεγχος διαθεσιμότητας…" />}
          {date && slotsState === "error" && <ErrorState text="Σφάλμα ελέγχου." onRetry={() => loadSlots(date)} />}
          {date && slotsState === "ready" && slots.length === 0 && (
            <EmptyState title="Καμία διαθέσιμη ώρα" text="Δοκίμασε άλλη ημέρα ή «Πρώτο διαθέσιμο»." />
          )}
          {date && slotsState === "ready" && slots.length > 0 && (
            <View style={{ gap: sp(3) }}>
              {([["Πρωί", grouped.morning], ["Μεσημέρι", grouped.noon], ["Απόγευμα", grouped.afternoon]] as const).map(([label, arr]) =>
                arr.length ? (
                  <View key={label} style={{ gap: sp(2) }}>
                    <Eyebrow>{label}</Eyebrow>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(2) }}>
                      {arr.map((t) => (
                        <Pill key={t} label={t} selected={time === t} onPress={() => setTime(t)} />
                      ))}
                    </View>
                  </View>
                ) : null,
              )}
            </View>
          )}

          <View style={{ flexDirection: "row", gap: sp(3) }}>
            <View style={{ flex: 1 }}>
              <Button title="← Πίσω" variant="ghost" onPress={() => setStep(multiBarber ? "barber" : "service")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Συνέχεια" disabled={!time} onPress={() => setStep("confirm")} />
            </View>
          </View>
        </>
      )}

      {step === "confirm" && service && (
        <>
          <H2>Σύνοψη</H2>
          <Card style={{ gap: sp(1.5) }}>
            <Row k="Υπηρεσία" v={service.name} />
            {multiBarber && <Row k="Κουρέας" v={barberId ? chosenBarber ?? "" : "Χωρίς προτίμηση"} />}
            <Row k="Ημέρα & ώρα" v={`${date ? fmtDateLong(date + "T12:00:00Z") : ""} · ${time}`} />
            <Row k="Διάρκεια" v={formatDuration(service.durationMin)} />
            {service.priceLabel && <Row k="Τιμή" v={service.priceLabel} />}
            <Row k="Πληρωμή" v="Στο κατάστημα" />
          </Card>

          {!customer && (
            <Card style={{ gap: sp(2) }}>
              <H2>Χρειάζεται σύνδεση</H2>
              <Muted>Συνδέσου για να ολοκληρώσεις την κράτηση — τα στοιχεία σου μένουν.</Muted>
              <Button title="Σύνδεση / Εγγραφή" onPress={() => router.push("/login")} />
            </Card>
          )}

          <View style={{ flexDirection: "row", gap: sp(3) }}>
            <View style={{ flex: 1 }}>
              <Button title="← Πίσω" variant="ghost" onPress={() => setStep("when")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Επιβεβαίωση" loading={submitting} disabled={!customer} onPress={confirm} />
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: colors.dim }}>{k}</Text>
      <Text style={{ color: colors.bone, fontWeight: "600", flexShrink: 1, textAlign: "right" }}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.bone, fontSize: 16, fontWeight: "700" },
  reco: { color: colors.gold, fontSize: 11, fontWeight: "700", backgroundColor: colors.goldSoft, paddingHorizontal: sp(2), paddingVertical: 2, borderRadius: radius.pill, overflow: "hidden" },
  price: { color: colors.gold, fontSize: 15, fontWeight: "700" },
  day: { width: 56, paddingVertical: sp(2.5), borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, alignItems: "center" },
  daySel: { backgroundColor: colors.gold, borderColor: colors.gold },
  dayWd: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  dayNum: { color: colors.bone, fontSize: 18, fontWeight: "800" },
});
