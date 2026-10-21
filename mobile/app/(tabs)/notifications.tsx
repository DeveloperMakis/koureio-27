import React from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen, H1, Muted, Card, Button, Loading, ErrorState, EmptyState } from "@/ui";
import { apiJson } from "@/api";
import { useAuth } from "@/auth";
import { colors, radius, sp } from "@/theme";
import { fmtDateShort, fmtTime } from "@/format";

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  data: string | null;
  read: boolean;
  createdAtISO: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { customer } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiJson<{ items: Notif[]; unreadCount: number }>("/api/v1/me/notifications?limit=50"),
    enabled: !!customer,
  });

  if (!customer) {
    return (
      <Screen>
        <H1>Ειδοποιήσεις</H1>
        <EmptyState title="Χρειάζεται σύνδεση" text="Συνδέσου για να βλέπεις τις ειδοποιήσεις των ραντεβού σου." />
        <Button title="Σύνδεση" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  async function markRead(ids?: string[]) {
    await apiJson("/api/v1/me/notifications", { method: "PATCH", body: ids ? { ids } : { all: true } });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["unread"] });
  }

  function open(n: Notif) {
    if (!n.read) markRead([n.id]);
    try {
      const d = n.data ? JSON.parse(n.data) : null;
      if (d?.screen === "offer" && d?.acceptUrl) {
        Linking.openURL(d.acceptUrl); // ασφαλής σελίδα αποδοχής προσφοράς
        return;
      }
      if (d?.screen === "booking") router.push("/bookings");
    } catch {
      /* ignore */
    }
  }

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <H1>Ειδοποιήσεις</H1>
        {(data?.unreadCount ?? 0) > 0 && (
          <Pressable onPress={() => markRead()}>
            <Text style={{ color: colors.gold, fontWeight: "700" }}>Όλα αναγνωσμένα</Text>
          </Pressable>
        )}
      </View>

      {isLoading && <Loading />}
      {isError && <ErrorState text="Δεν φόρτωσαν οι ειδοποιήσεις." onRetry={() => refetch()} />}
      {data && data.items.length === 0 && <EmptyState title="Καμία ειδοποίηση" text="Εδώ θα βλέπεις υπενθυμίσεις και αλλαγές στα ραντεβού σου." />}

      {data?.items.map((n) => (
        <Card key={n.id} onPress={() => open(n)} style={!n.read ? { borderColor: colors.gold } : undefined}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp(2) }}>
            {!n.read && <View style={styles.dot} />}
            <Text style={styles.title}>{n.title}</Text>
          </View>
          <Muted style={{ marginTop: sp(1) }}>{n.body}</Muted>
          <Muted style={{ color: colors.dim, fontSize: 12, marginTop: sp(1) }}>
            {fmtDateShort(n.createdAtISO)} · {fmtTime(n.createdAtISO)}
          </Muted>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.bone, fontSize: 16, fontWeight: "700", flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
});
