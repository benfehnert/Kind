import React, { useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Platform, AppState } from "react-native";
import { colors, fontFamily, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";
import {
  notificationStatusMessage,
  openNotificationSettings,
  promptForDailyRemindersOnIos,
  requestDailyReminderPermission,
  syncNotificationPermissionStatus
} from "../../lib/notifications";

const IOS_BODY =
  "Kind sends a gentle daily reminder to log your exploration data and keep your streak going. We'll open your iPhone Settings so you can turn notifications on for Kind.";

export function NotificationsOnboardingStep({ step, status, onChange }) {
  const promptStarted = useRef(false);
  const appState = useRef(AppState.currentState);

  const refreshPermissionStatus = useCallback(
    async ({ fromSettingsReturn = false } = {}) => {
      const { granted } = await syncNotificationPermissionStatus();
      if (granted) {
        onChange(step.answerKey, "granted");
      } else if (fromSettingsReturn && status !== "skipped") {
        onChange(step.answerKey, "denied");
      }
    },
    [onChange, status, step.answerKey]
  );

  useEffect(() => {
    if (Platform.OS !== "ios" || status != null || promptStarted.current) return;

    promptStarted.current = true;
    (async () => {
      const result = await promptForDailyRemindersOnIos();
      onChange(step.answerKey, result.granted ? "granted" : "denied");
    })();
  }, [onChange, status, step.answerKey]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const wasBackgrounded = appState.current.match(/inactive|background/);
      if (wasBackgrounded && nextAppState === "active" && Platform.OS === "ios") {
        refreshPermissionStatus({ fromSettingsReturn: true });
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [refreshPermissionStatus]);

  async function handleEnable() {
    if (Platform.OS === "web") {
      onChange(step.answerKey, "web_unavailable");
      return;
    }
    if (Platform.OS === "ios") {
      const result = await promptForDailyRemindersOnIos();
      onChange(step.answerKey, result.granted ? "granted" : "denied");
      return;
    }
    const result = await requestDailyReminderPermission();
    onChange(step.answerKey, result.granted ? "granted" : "denied");
  }

  const statusMessage = notificationStatusMessage(status);
  const body = Platform.OS === "ios" ? IOS_BODY : step.body;
  const isGranted = status === "granted";
  const canSkip = status !== "granted" && status !== "skipped" && status !== "web_unavailable";

  const enableLabel =
    Platform.OS === "web"
      ? "Continue on mobile app"
      : Platform.OS === "ios"
        ? isGranted
          ? "Notifications enabled"
          : "Open Settings"
        : "Allow notifications";

  return (
    <View>
      <Text style={styles.title}>{step.title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}

      <View style={styles.notificationCard}>
        <Text style={styles.notificationCardTitle}>Daily check-in reminders</Text>
        <Text style={styles.notificationCardBody}>
          A short nudge each day to log your exploration data and stay on track.
        </Text>
      </View>

      {statusMessage ? (
        <View
          style={[
            styles.notificationStatus,
            status === "granted" && styles.notificationStatusOk,
            (status === "denied" || status === "web_unavailable") && styles.notificationStatusWarn
          ]}
        >
          <Text style={styles.notificationStatusTxt}>{statusMessage}</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.enableBtn, isGranted && styles.enableBtnDisabled]}
        onPress={handleEnable}
        disabled={isGranted}
      >
        <Text style={styles.enableBtnTxt}>{enableLabel}</Text>
      </Pressable>

      {status === "denied" && Platform.OS === "android" ? (
        <Pressable style={styles.settingsLink} onPress={openNotificationSettings}>
          <Text style={styles.settingsLinkTxt}>Open device settings</Text>
        </Pressable>
      ) : null}

      {canSkip ? (
        <Pressable style={styles.skipLink} onPress={() => onChange(step.answerKey, "skipped")}>
          <Text style={styles.skipLinkTxt}>Not now</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 26,
    color: colors.text,
    lineHeight: 34,
    marginBottom: 12
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: 20
  },
  notificationCard: {
    backgroundColor: colors.greenLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.greenDark
  },
  notificationCardTitle: {
    ...type.buttonMd,
    color: colors.greenDark,
    marginBottom: spacing.xs
  },
  notificationCardBody: {
    ...type.exploreDesc,
    color: colors.textMuted,
    lineHeight: 22
  },
  notificationStatus: {
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  notificationStatusOk: {
    backgroundColor: colors.greenLight,
    borderColor: colors.greenDark
  },
  notificationStatusWarn: {
    backgroundColor: colors.amberBg,
    borderColor: colors.amberText
  },
  notificationStatusTxt: {
    ...type.exploreDesc,
    color: colors.text,
    lineHeight: 22
  },
  enableBtn: {
    backgroundColor: colors.greenDark,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.screen,
    alignItems: "center",
    marginBottom: spacing.md,
    minHeight: 48,
    justifyContent: "center"
  },
  enableBtnDisabled: {
    opacity: 0.55
  },
  enableBtnTxt: {
    ...type.buttonMd,
    color: "#fff"
  },
  settingsLink: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.sm
  },
  settingsLinkTxt: {
    ...type.buttonMd,
    color: colors.greenDark
  },
  skipLink: {
    alignItems: "center",
    paddingVertical: spacing.md
  },
  skipLinkTxt: {
    ...type.exploreDesc,
    color: colors.textMuted
  }
});
