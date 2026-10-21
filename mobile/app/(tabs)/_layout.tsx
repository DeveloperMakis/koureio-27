import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@/theme";
import { useAuth } from "@/auth";
import { apiJson } from "@/api";

export default function TabsLayout() {
  const { customer } = useAuth();

  const { data } = useQuery({
    queryKey: ["unread"],
    queryFn: () => apiJson<{ unreadCount: number }>("/api/v1/me/notifications?limit=1"),
    enabled: !!customer,
    refetchInterval: 60_000,
  });
  const unread = data?.unreadCount ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.bone,
        headerTitleStyle: { color: colors.bone },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.dim,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Αρχική", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: "Ραντεβού", tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Ειδοποιήσεις",
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.gold, color: colors.ink950 },
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Προφίλ", tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
