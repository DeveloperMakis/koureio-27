import React from "react";
import { View, Text, Linking, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen, H1, H2, Muted, Eyebrow, Card, Button, Loading, ErrorState, EmptyState } from "@/ui";
import { apiJson, apiFetch, API_BASE } from "@/api";
import { useAuth } from "@/auth";
import { colors, radius, sp } from "@/theme";
import { formatPrice, formatDuration, fmtDateLong, fmtTime } from "@/format";

interface Booking {
  code: string;
  cancelToken: string;
  serviceName: string;
  barberName: string;
  startAtISO: string;
  endAtISO: string;
  durationMin: number;
  priceCents: number | null;
  status: string;
}
interface MyBookings {
  upcoming: Booking[];
  past: Booking[];
}

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Επιβεβαιωμένο",
  CANCELLED: "Ακυρωμένο",
  COMPLETED: "Ολοκληρωμένο",
  NO_SHOW: "Μη προσέλευση",
};

export default function BookingsScreen() {
  const router = useRouter();
  const { customer } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => apiJson<MyBookings>("/api/v1/me/bookings"),
    enabled: !!customer,
  });

  if (!customer) {
    return (
      <Screen>
        <H1>Τα ραντεβού μου</H1>
        <EmptyState title="Χρειάζεται σύνδεση" text="Συνδέσου για να δεις και να διαχειριστείς τα ραντεβού σου." />
        <Button title="Σύνδεση" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  async function cancel(token: string) {
    Alert.alert("Ακύρωση ραντεβού", "Είσαι σίγουρος;", [
      { text: "Όχι", style: "cancel" },
      {
        text: "Ναι, ακύρωση",
        style: "destructive",
        onPress: async () => {
          const res = await apiFetch(`/api/bookings/${token}/cancel`, { method: "POST", auth: false });
          const d = await res.json().catch(() => ({}));
          if (res.ok && d.ok) {
            qc.invalidateQueries({ queryKey: ["my-bookings"] });
          } else {
            Alert.alert("Δεν έγινε", d.error ?? "Δοκίμασε ξανά ή τηλεφώνησε στο κατάστημα.");
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <H1>Τα ραντεβού μου</H1>

      {isLoading && <Loading />}
      {isError && <ErrorState text="Δεν φόρτωσαν τα ραντεβού." onRetry={() => refetch()} />}

      {data && (
        <>
          <Eyebrow>Επερχόμενα</Eyebrow>
          {data.upcoming.length === 0 && <EmptyState title="Κανένα επερχόμενο" text="Κλείσε το επόμενο ραντεβού σου." />}
          {data.upcoming.map((b) => (
            <BookingCard key={b.code} b={b} onCancel={() => cancel(b.cancelToken)} canManage />
          ))}

          {data.past.length > 0 && (
            <>
              <Eyebrow>Προηγούμενα</Eyebrow>
              {data.past.map((b) => (
                <BookingCard key={b.code} b={b} />
              ))}
            </>
          )}
        </>
      )}

      <Button title="Κλείσε νέο ραντεβού" onPress={() => router.push("/booking")} />
    </Screen>
  );
}

function BookingCard({ b, onCancel, canManage }: { b: Booking; onCancel?: () => void; canManage?: boolean }) {
  const confirmed = b.status === "CONFIRMED";
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <H2>{b.serviceName}</H2>
        <View style={[styles.status, confirmed ? styles.stOk : b.status === "CANCELLED" ? styles.stBad : styles.stNeutral]}>
          <Text style={styles.statusText}>{STATUS_LABEL[b.status] ?? b.status}</Text>
        </View>
      </View>
      <Muted>
        {fmtDateLong(b.startAtISO)} · {fmtTime(b.startAtISO)}
      </Muted>
      <Muted>
        {b.barberName} · {formatDuration(b.durationMin)}
        {formatPrice(b.priceCents) ? ` · ${formatPrice(b.priceCents)}` : ""}
      </Muted>
      <Muted style={{ color: colors.dim, fontSize: 12 }}>#{b.code}</Muted>

      {canManage && confirmed && (
        <View style={{ gap: sp(2.5), marginTop: sp(3) }}>
          <View style={{ flexDirection: "row", gap: sp(2.5) }}>
            <View style={{ flex: 1 }}>
              <Button title="Ημερολόγιο" variant="secondary" onPress={() => Linking.openURL(`${API_BASE}/api/bookings/${b.cancelToken}/ics`)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Αλλαγή" variant="secondary" onPress={() => Linking.openURL(`${API_BASE}/rantevou/${b.cancelToken}`)} />
            </View>
          </View>
          <Button title="Ακύρωση" variant="danger" onPress={onCancel} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  status: { paddingHorizontal: sp(3), paddingVertical: sp(1), borderRadius: radius.pill },
  statusText: { fontSize: 12, fontWeight: "700", color: colors.bone },
  stOk: { backgroundColor: "rgba(83,192,138,0.18)" },
  stBad: { backgroundColor: "rgba(229,103,95,0.18)" },
  stNeutral: { backgroundColor: colors.panel2 },
});
