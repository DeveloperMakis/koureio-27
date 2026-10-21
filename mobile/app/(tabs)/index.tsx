import React from "react";
import { View, Text, Image, Linking, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, H1, H2, Muted, Eyebrow, Card, Button, Loading, ErrorState } from "@/ui";
import { apiJson, API_BASE } from "@/api";
import { useAuth } from "@/auth";
import { colors, radius, sp } from "@/theme";
import { formatPrice, formatDuration, fmtDateShort, fmtTime } from "@/format";

interface Catalog {
  business: { name: string; area: string; address: string; phones: { display: string; tel: string }[]; instagram: string | null; mapsDirectionsUrl: string };
  services: { id: string; slug: string; name: string; durationMin: number; durationLabel: string; priceLabel: string | null; recommended: boolean }[];
}
interface MyBookings {
  upcoming: { code: string; serviceName: string; barberName: string; startAtISO: string }[];
  past: { serviceName: string; code: string }[];
}

export default function HomeScreen() {
  const router = useRouter();
  const { customer } = useAuth();

  const catalog = useQuery({ queryKey: ["catalog"], queryFn: () => apiJson<Catalog>("/api/v1/catalog") });
  const mine = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => apiJson<MyBookings>("/api/v1/me/bookings"),
    enabled: !!customer,
  });

  const next = mine.data?.upcoming?.[0];
  const lastService = mine.data?.past?.[0]?.serviceName;
  const phone = catalog.data?.business.phones?.[0];

  return (
    <Screen>
      {/* Hero */}
      <View style={styles.hero}>
        <Image source={{ uri: `${API_BASE}/logo.png` }} style={{ width: 56, height: 56 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>ΤΟ ΚΟΥΡΕΙΟΝ 27</Text>
          <Eyebrow>Barber Shop · Κορυδαλλός</Eyebrow>
        </View>
      </View>

      <Image source={{ uri: `${API_BASE}/photos/hero.webp` }} style={styles.heroImg} resizeMode="cover" />

      <Button title="Κλείσε ραντεβού" onPress={() => router.push("/booking")} />

      {/* Επόμενο ραντεβού */}
      {customer && next && (
        <Card>
          <Eyebrow>Επόμενο ραντεβού</Eyebrow>
          <H2>{next.serviceName}</H2>
          <Muted>
            {fmtDateShort(next.startAtISO)} · {fmtTime(next.startAtISO)} — {next.barberName}
          </Muted>
          <View style={{ marginTop: sp(3) }}>
            <Button title="Δες τα ραντεβού μου" variant="secondary" onPress={() => router.push("/bookings")} />
          </View>
        </Card>
      )}

      {!customer && (
        <Card>
          <H2>Σύνδεση</H2>
          <Muted>Συνδέσου για να βλέπεις τα ραντεβού σου και να λαμβάνεις ειδοποιήσεις.</Muted>
          <View style={{ flexDirection: "row", gap: sp(3), marginTop: sp(3) }}>
            <View style={{ flex: 1 }}>
              <Button title="Σύνδεση" onPress={() => router.push("/login")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Εγγραφή" variant="secondary" onPress={() => router.push("/register")} />
            </View>
          </View>
        </Card>
      )}

      {/* Υπηρεσίες */}
      <Eyebrow>Υπηρεσίες</Eyebrow>
      {catalog.isLoading && <Loading />}
      {catalog.isError && <ErrorState text="Δεν φόρτωσαν οι υπηρεσίες." onRetry={() => catalog.refetch()} />}
      {catalog.data?.services.map((s) => (
        <Card key={s.id} onPress={() => router.push(`/booking?service=${s.slug}`)}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: sp(3) }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.svcName}>{s.name}</Text>
              <Muted>{formatDuration(s.durationMin)}</Muted>
            </View>
            {s.priceLabel && <Text style={styles.price}>{s.priceLabel}</Text>}
          </View>
        </Card>
      ))}

      {lastService && (
        <Button title={`Κλείσε ξανά: ${lastService}`} variant="secondary" onPress={() => router.push("/booking")} />
      )}

      {/* Σύνδεσμοι */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(3), marginTop: sp(2) }}>
        {phone && <Button title={`Κλήση ${phone.display}`} variant="secondary" onPress={() => Linking.openURL(`tel:${phone.tel}`)} />}
        {catalog.data?.business.mapsDirectionsUrl && (
          <Button title="Οδηγίες" variant="secondary" onPress={() => Linking.openURL(catalog.data!.business.mapsDirectionsUrl)} />
        )}
        {catalog.data?.business.instagram && (
          <Button title="Instagram" variant="secondary" onPress={() => Linking.openURL(catalog.data!.business.instagram!)} />
        )}
      </View>
      {catalog.data?.business.address && <Muted>{catalog.data.business.address}</Muted>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: sp(3) },
  brand: { color: colors.bone, fontSize: 20, fontWeight: "800" },
  heroImg: { width: "100%", height: 200, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  svcName: { color: colors.bone, fontSize: 16, fontWeight: "700" },
  price: { color: colors.gold, fontSize: 15, fontWeight: "700", backgroundColor: colors.goldSoft, paddingHorizontal: sp(3), paddingVertical: sp(1.5), borderRadius: radius.pill },
});
