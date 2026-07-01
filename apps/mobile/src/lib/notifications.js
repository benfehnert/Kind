import { Platform, Linking } from "react-native";
import * as Notifications from "expo-notifications";

export async function getNotificationPermissionStatus() {
  if (Platform.OS === "web") return "unavailable";
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function syncNotificationPermissionStatus() {
  const status = await getNotificationPermissionStatus();
  return {
    granted: status === "granted",
    status
  };
}

export async function requestDailyReminderPermission() {
  if (Platform.OS === "web") {
    return { granted: false, status: "unavailable" };
  }

  const existing = await getNotificationPermissionStatus();
  if (existing === "granted") {
    return { granted: true, status: "granted" };
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return { granted: status === "granted", status };
}

export async function promptForDailyRemindersOnIos() {
  const { granted, status } = await syncNotificationPermissionStatus();

  if (granted) {
    return { granted: true, status: "granted", openedSettings: false };
  }

  if (status === "undetermined") {
    const { status: requestedStatus } = await Notifications.requestPermissionsAsync();
    if (requestedStatus === "granted") {
      return { granted: true, status: "granted", openedSettings: false };
    }
  }

  openNotificationSettings();
  return { granted: false, status: "denied", openedSettings: true };
}

export function openNotificationSettings() {
  Linking.openSettings();
}

export function notificationStatusMessage(status) {
  switch (status) {
    case "granted":
      return "Notifications are turned on. You'll receive daily check-in reminders.";
    case "denied":
      return "Notifications are off on this device. Turn them on in your device settings to receive daily reminders.";
    case "skipped":
      return "You can turn on notifications later from your profile.";
    case "web_unavailable":
      return "Daily notification reminders are available in the iOS and Android apps.";
    default:
      return null;
  }
}
