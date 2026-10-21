import React, { useState } from "react";
import { Text, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, H1, Muted, Field, Button } from "@/ui";
import { useAuth } from "@/auth";
import { colors, sp } from "@/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      await signIn(email.trim(), password);
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (e: any) {
      setErr(e?.message ?? "Αποτυχία σύνδεσης.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <H1>Σύνδεση</H1>
      <Muted>Μπες για να βλέπεις τα ραντεβού και τις ειδοποιήσεις σου.</Muted>
      <Field label="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Field label="Κωδικός" secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} />
      {err && <Text style={{ color: colors.danger }}>{err}</Text>}
      <Button title="Σύνδεση" loading={loading} onPress={submit} />
      <Pressable onPress={() => router.replace("/register")} style={{ paddingVertical: sp(2) }}>
        <Muted style={{ textAlign: "center" }}>
          Δεν έχεις λογαριασμό; <Text style={{ color: colors.gold }}>Εγγραφή</Text>
        </Muted>
      </Pressable>
    </Screen>
  );
}
