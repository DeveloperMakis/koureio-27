import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiFetch } from "./api";
import { getInstallationId } from "./storage";

// Πώς εμφανίζονται οι ειδοποιήσεις όταν η εφαρμογή είναι ανοιχτή.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Ζητά άδεια (αν δεν έχει ήδη), παίρνει Expo push token και εγγράφει τη συσκευή.
 * Επιστρέφει true αν η εγγραφή πέτυχε. ΔΕΝ επαναλαμβάνει επιθετικά το αίτημα:
 * αν ο χρήστης έχει αρνηθεί, το OS δεν ξαναδείχνει dialog.
 */
export async function registerForPush(): Promise<boolean> {
  if (!Device.isDevice) return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Ραντεβού",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#c9a349",
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return false;

  try {
    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const installationId = await getInstallationId();
    const res = await apiFetch("/api/v1/devices", {
      method: "POST",
      body: { expoPushToken: tokenData.data, platform: Platform.OS === "ios" ? "ios" : "android", installationId },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Αφαίρεση συσκευής (στο logout). */
export async function unregisterPush(): Promise<void> {
  try {
    const installationId = await getInstallationId();
    await apiFetch("/api/v1/devices", { method: "DELETE", body: { installationId } });
  } catch {
    /* ignore */
  }
}
