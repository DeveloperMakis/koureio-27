import { useEffect, useRef } from "react";
import { Linking } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useAuth } from "./auth";
import { registerForPush } from "./push";

/**
 * Συνδέει τα push με την εφαρμογή:
 * - Εγγράφει τη συσκευή όταν ο χρήστης είναι συνδεδεμένος & έχει ενεργές ειδοποιήσεις.
 * - Με πάτημα ειδοποίησης, ανοίγει την κατάλληλη οθόνη (deep link) αφού ελεγχθεί
 *   η σύνδεση/εξουσιοδότηση.
 */
export function PushBridge() {
  const { customer } = useAuth();
  const router = useRouter();
  const registered = useRef(false);

  useEffect(() => {
    if (customer && (customer.notifyPush ?? true) && !registered.current) {
      registered.current = true;
      registerForPush().catch(() => {});
    }
    if (!customer) registered.current = false;
  }, [customer]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { screen?: string; acceptUrl?: string } | undefined;
      if (data?.screen === "offer" && data?.acceptUrl) {
        Linking.openURL(data.acceptUrl);
        return;
      }
      // Deep link μόνο αν ο χρήστης είναι συνδεδεμένος (οι προσωπικές οθόνες το απαιτούν).
      if (!customer) {
        router.push("/login");
        return;
      }
      if (data?.screen === "booking") router.push("/bookings");
    });
    return () => sub.remove();
  }, [customer]);

  return null;
}
