import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Linking } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fontFamily, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";
import { PRIVACY_POLICY_URL } from "../../data/explorerOnboarding";
import { SelectionCard, YesNoCards } from "./SelectionCard";
import { KindBlob, ShieldIcon } from "./KindBlob";
import { ValuePropIcon } from "./ValuePropIcon";

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" style={{ marginRight: 10 }}>
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function openPrivacyPolicy() {
  Linking.openURL(PRIVACY_POLICY_URL);
}

export function renderWelcomeStep() {
  return (
    <View style={styles.welcomeWrap}>
      <View style={styles.logoBlock}>
        <Text style={styles.logo}>kind</Text>
        <Text style={styles.strapline}>health exploration</Text>
      </View>
      <Text style={styles.welcomeHeadline}>
        Understand what actually{"\n"}works for <Text style={styles.accent}>you.</Text>
      </Text>
      <View style={styles.welcomeGraphic}>
        <KindBlob size={180} />
      </View>
    </View>
  );
}

export function renderMessageStep(step) {
  if (step.bubble) {
    return (
      <View style={styles.introWrap}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleTxt}>{step.bubble}</Text>
        </View>
        <View style={styles.introBlob}>
          <KindBlob size={220} />
        </View>
      </View>
    );
  }

  return (
    <View>
      {step.icon === "alpha" ? null : (
        <View style={styles.iconWrap}>
          {step.id === "consent-privacy" ? (
            <ShieldIcon size={80} />
          ) : (
            <ValuePropIcon name={step.icon} size={100} />
          )}
        </View>
      )}
      <Text style={styles.title}>{step.title}</Text>
      {step.body ? <Text style={styles.body}>{step.body}</Text> : null}
      {step.note ? (
        <View style={styles.noteCard}>
          <Text style={styles.noteTxt}>{step.note}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function renderYesNoStep(step, answers, onChange) {
  const value = answers[step.answerKey];

  return (
    <View>
      {step.id === "consent-privacy" ? (
        <View style={styles.iconWrap}>
          <ShieldIcon size={80} />
        </View>
      ) : null}
      <Text style={styles.title}>{step.title}</Text>
      {step.body ? <Text style={styles.body}>{step.body}</Text> : null}

      {step.bullets ? (
        <View style={styles.bulletList}>
          {step.bullets.map((b) =>
            b.includes("Privacy Policy") ? (
              <View key={b} style={styles.bulletRow}>
                <Text style={styles.bulletMark}>✓</Text>
                <Text style={styles.bulletTxt}>
                  Learn more in our{" "}
                  <Text style={styles.link} onPress={openPrivacyPolicy}>
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            ) : (
              <View key={b} style={styles.bulletRow}>
                <Text style={styles.bulletMark}>✓</Text>
                <Text style={styles.bulletTxt}>{b}</Text>
              </View>
            )
          )}
        </View>
      ) : null}

      <YesNoCards
        value={value}
        onChange={(v) => onChange(step.answerKey, v)}
        yesSub={
          step.answerKey === "consentPrivacy"
            ? "Got it! I'll use your data only as described in our Privacy Policy."
            : step.answerKey === "consentCitizenScience"
              ? "Thank you — your anonymised data helps advance citizen science."
              : step.answerKey === "consentDiscoverable"
                ? "Great! Others will be able to find and follow you in Kind."
                : undefined
        }
        noSub={
          step.answerKey === "consentDiscoverable"
            ? "No problem — you can change this later in your profile."
            : step.answerKey === "consentCitizenScience"
              ? "That's fine — you can still use Kind without contributing to research."
              : undefined
        }
      />

      {step.requireYes && value === false && step.denyMessage ? (
        <Text style={styles.denyMsg}>{step.denyMessage}</Text>
      ) : null}
    </View>
  );
}

export function renderTextStep(step, answers, onChange) {
  const value = answers[step.answerKey] || "";
  return (
    <View>
      <Text style={styles.title}>{step.title}</Text>
      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>{step.label}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(t) => onChange(step.answerKey, t)}
          placeholder={step.placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

export function renderYearStep(step, answers, onChange) {
  const value = answers[step.answerKey] || "";
  return (
    <View>
      <Text style={styles.title}>{step.title}</Text>
      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>{step.label}</Text>
        <TextInput
          style={styles.input}
          value={String(value)}
          onChangeText={(t) => onChange(step.answerKey, t.replace(/[^0-9]/g, ""))}
          placeholder={step.placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>
    </View>
  );
}

export function renderSingleSelectStep(step, answers, onChange) {
  const value = answers[step.answerKey];
  return (
    <View>
      <Text style={styles.title}>{step.title}</Text>
      <View style={styles.optionStack}>
        {step.options.map((opt) => (
          <SelectionCard
            key={opt.value}
            label={opt.label}
            selected={value === opt.value}
            onPress={() => onChange(step.answerKey, opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

export function renderMultiSelectStep(step, answers, onChange) {
  const selected = answers[step.answerKey] || [];
  const toggle = (val) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(step.answerKey, next);
  };

  return (
    <View>
      <Text style={styles.title}>{step.title}</Text>
      <View style={styles.optionStack}>
        {step.options.map((opt) => (
          <SelectionCard
            key={opt.value}
            label={opt.label}
            selected={selected.includes(opt.value)}
            onPress={() => toggle(opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

export function renderRemindersStep(step, answers, onChange) {
  const value = answers[step.answerKey];
  return (
    <View>
      <Text style={styles.title}>{step.title}</Text>
      {step.body ? <Text style={styles.body}>{step.body}</Text> : null}
      <YesNoCards
        value={value}
        onChange={(v) => onChange(step.answerKey, v)}
        yesSub={value === true ? "I'll send you a gentle nudge each day to help you stay on track." : undefined}
        noSub={value === false ? "No worries — you can turn reminders on later in your profile." : undefined}
      />
    </View>
  );
}

export function renderCreateAccountStep(step, answers, onGooglePress) {
  const name = (answers.name || "").trim() || "there";
  return (
    <View style={styles.accountWrap}>
      <Text style={styles.accountTitle}>Now it's your turn, {name}</Text>
      <Text style={styles.accountBody}>
        Create an account to save your progress, access your scores, and get daily insights.
      </Text>
      <Pressable style={styles.googleBtn} onPress={onGooglePress}>
        <GoogleIcon />
        <Text style={styles.googleBtnTxt}>{step.continueLabel || "Continue with Google"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeWrap: { flex: 1, paddingTop: 40 },
  logoBlock: { marginBottom: 32 },
  logo: {
    fontFamily: fontFamily.logo,
    fontSize: 48,
    color: colors.greenDark,
    letterSpacing: -1
  },
  strapline: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.orange,
    letterSpacing: 1.2,
    textTransform: "lowercase",
    marginTop: 4
  },
  welcomeHeadline: {
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    color: colors.text,
    lineHeight: 36,
    marginBottom: 24
  },
  accent: { color: colors.orange },
  welcomeGraphic: { alignItems: "center", marginTop: 16 },
  introWrap: { flex: 1, alignItems: "center" },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8
      },
      android: { elevation: 2 },
      default: {}
    })
  },
  bubbleTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 17,
    color: colors.text,
    lineHeight: 26
  },
  introBlob: { alignItems: "center", marginTop: 8 },
  iconWrap: { alignItems: "center", marginBottom: 20, marginTop: 8 },
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
  noteCard: {
    backgroundColor: colors.amberBg,
    borderRadius: 12,
    padding: 14,
    marginTop: 4
  },
  noteTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.amberText,
    lineHeight: 21
  },
  bulletList: { marginBottom: 20, gap: 10 },
  bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  bulletMark: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  bulletTxt: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21
  },
  link: {
    color: colors.greenDark,
    textDecorationLine: "underline",
    fontFamily: fontFamily.semibold
  },
  denyMsg: {
    marginTop: 16,
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.orangeDark,
    lineHeight: 20
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 8
  },
  inputLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 6
  },
  input: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: colors.text,
    padding: 0
  },
  optionStack: { gap: 12, marginTop: 8 },
  accountWrap: { paddingTop: 24 },
  accountTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    color: colors.text,
    lineHeight: 36,
    marginBottom: 12
  },
  accountBody: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: 32
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.screen,
    minHeight: 48
  },
  googleBtnTxt: {
    ...type.buttonMd,
    color: colors.text
  }
});
