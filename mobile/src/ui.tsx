import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, sp } from "./theme";

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const inner = <View style={{ padding: sp(5), gap: sp(4), flexGrow: 1 }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: sp(10) }}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}
export function Muted({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Card({ children, style, onPress, selected }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; selected?: boolean }) {
  const content = <View style={[styles.card, selected && styles.cardSelected, style]}>{children}</View>;
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        isPrimary && styles.btnPrimary,
        variant === "secondary" && styles.btnSecondary,
        variant === "ghost" && styles.btnGhost,
        variant === "danger" && styles.btnDanger,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.ink950 : colors.gold} />
      ) : (
        <Text style={[styles.btnText, isPrimary ? { color: colors.ink950 } : { color: variant === "danger" ? colors.danger : colors.gold }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Pill({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, selected && styles.pillSelected]}>
      <Text style={[styles.pillText, selected && { color: colors.ink950, fontWeight: "700" }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: sp(1.5) }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.dim}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function Loading({ text }: { text?: string }) {
  return (
    <View style={{ padding: sp(10), alignItems: "center", gap: sp(3) }}>
      <ActivityIndicator color={colors.gold} />
      {text ? <Muted>{text}</Muted> : null}
    </View>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <Card style={{ alignItems: "center", gap: sp(2) }}>
      <Text style={styles.h2}>{title}</Text>
      {text ? <Muted style={{ textAlign: "center" }}>{text}</Muted> : null}
    </Card>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <Card style={{ gap: sp(3), borderColor: "rgba(229,103,95,0.4)" }}>
      <Text style={{ color: colors.danger }}>{text}</Text>
      {onRetry ? <Button title="Δοκίμασε ξανά" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

export function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.bone, fontSize: 30, fontWeight: "800", letterSpacing: 0.2 },
  h2: { color: colors.bone, fontSize: 18, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  eyebrow: { color: colors.gold, fontSize: 12, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  card: { backgroundColor: colors.panel, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: sp(5) },
  cardSelected: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  btn: { minHeight: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(6) },
  btnPrimary: { backgroundColor: colors.gold },
  btnSecondary: { borderWidth: 1, borderColor: colors.border },
  btnGhost: {},
  btnDanger: { borderWidth: 1, borderColor: "rgba(229,103,95,0.4)" },
  btnText: { fontSize: 16, fontWeight: "700" },
  pill: { paddingHorizontal: sp(4), paddingVertical: sp(2.5), borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  pillSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  label: { color: colors.muted, fontSize: 13 },
  input: { backgroundColor: colors.ink950, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: sp(4), paddingVertical: sp(3.5), color: colors.bone, fontSize: 16 },
  badge: { backgroundColor: colors.gold, borderRadius: radius.pill, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.ink950, fontSize: 11, fontWeight: "800" },
});
