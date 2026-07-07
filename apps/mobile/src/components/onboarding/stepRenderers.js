import React from "react";
import { View, Text, TextInput, StyleSheet, Platform, Linking } from "react-native";
import { colors, fontFamily, radius } from "../../theme/colors";
import { PRIVACY_POLICY_URL } from "../../data/explorerOnboarding";
import { SelectionCard, YesNoCards } from "./SelectionCard";
import { KindBlob, ShieldIcon } from "./KindBlob";
import { ValuePropIcon } from "./ValuePropIcon";
import { AccountOnboardingStep } from "./AccountOnboardingStep";

function openPrivacyPolicy() {
  Linking.openURL(PRIVACY_POLICY_URL);
}

export function renderWelcomeStep() {
  return (
    <View style={styles.welcomeWrap}>
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
      {step.subtitle ? <Text style={styles.subtitle}>{step.subtitle}</Text> : null}
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
      {step.subtitle ? <Text style={styles.subtitle}>{step.subtitle}</Text> : null}
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

export function renderSignupStep(step, answers, onChange, error) {
  return (
    <AccountOnboardingStep step={step} answers={answers} onChange={onChange} error={error} />
  );
}

export function renderFinishStep(step, answers) {
  const name = (answers.name || "").trim() || "there";
  return (
    <View style={styles.accountWrap}>
      <Text style={styles.accountTitle}>{step.title || `You're all set, ${name}`}</Text>
      <Text style={styles.accountBody}>{step.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeWrap: { flex: 1 },
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
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 16
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
  }
});
