import React, { useState } from "react";
import { View, Text, Switch, Linking, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, H1, H2, Muted, Eyebrow, Card, Button, Field, Pill, EmptyState } from "@/ui";
import { apiJson, apiFetch, API_BASE, Customer } from "@/api";
import { useAuth } from "@/auth";
import { colors, sp } from "@/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { customer, loading, signOut, setCustomer } = useAuth();

  const barbers = useQuery({
    queryKey: ["barbers"],
    queryFn: () => apiJson<{ barbers: { id: string; name: string }[] }>("/api/v1/catalog"),
  });

  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [saving, setSaving] = useState(false);

  if (!customer) {
    return (
      <Screen>
        <H1>Προφίλ</H1>
        <EmptyState title="Δεν έχεις συνδεθεί" text="Συνδέσου ή δημιούργησε λογαριασμό για ραντεβού και ειδοποιήσεις." />
        <View style={{ flexDirection: "row", gap: sp(3) }}>
          <View style={{ flex: 1 }}>
            <Button title="Σύνδεση" onPress={() => router.push("/login")} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Εγγραφή" variant="secondary" onPress={() => router.push("/register")} />
          </View>
        </View>
      </Screen>
    );
  }

  async function patch(body: Record<string, unknown>) {
    const d = await apiJson<{ customer: Customer }>("/api/v1/me", { method: "PATCH", body });
    setCustomer(d.customer);
    return d.customer;
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await patch({ name, phone });
      Alert.alert("Αποθηκεύτηκε", "Τα στοιχεία σου ενημερώθηκαν.");
    } catch (e: any) {
      Alert.alert("Σφάλμα", e?.message ?? "Δοκίμασε ξανά.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(id: string) {
    const next = customer?.favoriteBarberId === id ? null : id;
    await patch({ favoriteBarberId: next }).catch(() => {});
  }

  async function togglePush(v: boolean) {
    await patch({ notifyPush: v }).catch(() => {});
  }

  function confirmDelete() {
    Alert.alert(
      "Διαγραφή λογαριασμού",
      "Θα ακυρωθούν τα μελλοντικά σου ραντεβού και ο λογαριασμός θα διαγραφεί οριστικά. Συνέχεια;",
      [
        { text: "Άκυρο", style: "cancel" },
        {
          text: "Διαγραφή",
          style: "destructive",
          onPress: async () => {
            const res = await apiFetch("/api/v1/me", { method: "DELETE" });
            if (res.ok) {
              await signOut();
              Alert.alert("Έγινε", "Ο λογαριασμός διαγράφηκε.");
            } else {
              Alert.alert("Σφάλμα", "Δεν ήταν δυνατή η διαγραφή. Δοκίμασε ξανά.");
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <H1>Προφίλ</H1>
      <Muted>{customer.email}</Muted>

      <Card style={{ gap: sp(4) }}>
        <H2>Στοιχεία</H2>
        <Field label="Όνομα" value={name} onChangeText={setName} />
        <Field label="Κινητό" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button title={saving ? "Αποθήκευση…" : "Αποθήκευση"} onPress={saveProfile} loading={saving} />
      </Card>

      <Card style={{ gap: sp(3) }}>
        <H2>Αγαπημένος κουρέας</H2>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(2) }}>
          {barbers.data?.barbers.map((b) => (
            <Pill key={b.id} label={b.name} selected={customer.favoriteBarberId === b.id} onPress={() => toggleFavorite(b.id)} />
          ))}
        </View>
      </Card>

      <Card style={{ gap: sp(2) }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, paddingRight: sp(3) }}>
            <H2>Ειδοποιήσεις</H2>
            <Muted>Υπενθυμίσεις και αλλαγές στα ραντεβού σου.</Muted>
          </View>
          <Switch
            value={customer.notifyPush ?? true}
            onValueChange={togglePush}
            trackColor={{ true: colors.gold, false: colors.panel2 }}
            thumbColor={colors.bone}
          />
        </View>
      </Card>

      <Card style={{ gap: sp(2.5) }}>
        <Button title="Πολιτική απορρήτου" variant="ghost" onPress={() => Linking.openURL(`${API_BASE}/aporrito`)} />
        <Button title="Όροι" variant="ghost" onPress={() => Linking.openURL(`${API_BASE}/oroi`)} />
      </Card>

      <Button title="Αποσύνδεση" variant="secondary" onPress={signOut} />
      <Button title="Διαγραφή λογαριασμού" variant="danger" onPress={confirmDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({});
