import React, { useState } from "react";
import { Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen, H1, Muted, Field, Button } from "@/ui";
import { useAuth } from "@/auth";
import { colors, sp } from "@/theme";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      await signUp({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, password });
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (e: any) {
      setErr(e?.message ?? "Αποτυχία εγγραφής.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <H1>Εγγραφή</H1>
      <Muted>Δημιούργησε λογαριασμό για γρήγορες κρατήσεις και ειδοποιήσεις.</Muted>
      <Field label="Όνομα" value={name} onChangeText={setName} autoComplete="name" />
      <Field label="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
      <Field label="Κινητό (προαιρετικό)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <Field label="Κωδικός (8+ χαρακτήρες)" secureTextEntry value={password} onChangeText={setPassword} />
      {err && <Text style={{ color: colors.danger }}>{err}</Text>}
      <Button title="Δημιουργία λογαριασμού" loading={loading} onPress={submit} />
      <Pressable onPress={() => router.replace("/login")} style={{ paddingVertical: sp(2) }}>
        <Muted style={{ textAlign: "center" }}>
          Έχεις ήδη λογαριασμό; <Text style={{ color: colors.gold }}>Σύνδεση</Text>
        </Muted>
      </Pressable>
    </Screen>
  );
}
