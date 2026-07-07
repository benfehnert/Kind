import React, { useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useData } from "../context/DataContext";
import { useConsent } from "../context/ConsentContext";
import { useUiShell } from "../context/UiContext";
import { colors, fontFamily } from "../theme/colors";
import { PRIVACY_POLICY_URL } from "../data/explorerOnboarding";

function CheckRow({ checked, onToggle, label, sub, required }) {
  return (
    <Pressable
      style={styles.checkRow}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Text style={styles.boxTick}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.checkLabel}>
          {label}
          {required ? <Text style={styles.req}> · required</Text> : null}
        </Text>
        {sub ? <Text style={styles.checkSub}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function OnboardingConsentScreen() {
  const { consent } = useData();
  const navigation = useNavigation();
  const { params } = useRoute();
  const review = Boolean(params?.review);
  const { choices, saveConsent } = useConsent();
  const { showToast } = useUiShell();

  const steps = consent.steps || [];
  // index 0 = intro, 1..steps.length = consent steps, steps.length+1 = complete.
  // Review mode skips the intro and jumps straight to the first consent step.
  const [stage, setStage] = useState(review ? 1 : 0);

  const initialDraft = useMemo(() => {
    const d = {};
    steps.forEach((s) =>
      (s.consents || []).forEach((c) => {
        // Fresh onboarding starts fully unticked (opt-in); review pre-fills saved choices.
        d[c.key] = review ? Boolean(choices[c.key]) : false;
      })
    );
    return d;
  }, [steps, choices, review]);
  const [draft, setDraft] = useState(initialDraft);

  const totalSteps = steps.length;
  const isIntro = stage === 0;
  const isComplete = stage === totalSteps + 1;
  const stepIndex = stage - 1;
  const step = !isIntro && !isComplete ? steps[stepIndex] : null;

  const toggle = (key) => setDraft((prev) => ({ ...prev, [key]: !prev[key] }));

  const requiredMet = (s) =>
    (s.consents || []).filter((c) => c.required).every((c) => draft[c.key]);

  const goNext = () => {
    if (step && !requiredMet(step)) {
      showToast("Please agree to the required item to continue.");
      return;
    }
    setStage((s) => s + 1);
  };

  const minStage = review ? 1 : 0;
  const goBack = () => {
    if (stage <= minStage) {
      navigation.goBack();
      return;
    }
    setStage((s) => s - 1);
  };

  const finish = () => {
    saveConsent(draft);
    showToast("Your consent choices have been saved.");
    navigation.navigate("ConsentSummary");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.top}>
        <Pressable onPress={goBack} hitSlop={12}>
          <Text style={styles.back}>{stage <= minStage && !review ? "✕ Close" : "‹ Back"}</Text>
        </Pressable>
        <Text style={styles.hdr}>{review ? "Review & change choices" : "Onboarding & consent"}</Text>
      </View>

      {!isIntro && !isComplete ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(stage / (totalSteps + 1)) * 100}%` }]} />
          </View>
          <Text style={styles.progressTxt}>
            Step {stage} of {totalSteps} · {step.screen}
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {isIntro ? <IntroBlock /> : null}

        {step ? (
          <View>
            <Text style={styles.eyebrow}>{step.eyebrow}</Text>
            <Text style={styles.title}>{step.title}</Text>
            {step.body ? <Text style={styles.body}>{step.body}</Text> : null}
            {step.body2 ? <Text style={styles.body}>{step.body2}</Text> : null}

            {step.showExploration ? <ExplorationCard /> : null}

            {step.footnote ? <Text style={styles.foot}>{step.footnote}</Text> : null}
            {step.linkLabel ? (
              <Pressable
                onPress={() =>
                  step.linkLabel.includes("Privacy Policy")
                    ? Linking.openURL(PRIVACY_POLICY_URL)
                    : showToast("Prototype: opens " + step.linkLabel + ".")
                }
              >
                <Text style={styles.link}>{step.linkLabel} ›</Text>
              </Pressable>
            ) : null}

            <View style={styles.consentBlock}>
              {(step.consents || []).map((c) => (
                <CheckRow
                  key={c.key}
                  checked={Boolean(draft[c.key])}
                  onToggle={() => toggle(c.key)}
                  label={c.label}
                  sub={c.sub}
                  required={c.required}
                />
              ))}
            </View>

            {step.withdrawNote ? <Text style={styles.withdraw}>{step.withdrawNote}</Text> : null}
          </View>
        ) : null}

        {isComplete ? <CompleteBlock draft={draft} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        {isIntro ? (
          <>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => navigation.goBack()}>
              <Text style={styles.btnGhostTxt}>{consent.intro.exitButton}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => setStage(1)}>
              <Text style={styles.btnPrimaryTxt}>{consent.intro.startButton}</Text>
            </Pressable>
          </>
        ) : isComplete ? (
          <Pressable style={[styles.btn, styles.btnPrimary, { flex: 1 }]} onPress={finish}>
            <Text style={styles.btnPrimaryTxt}>{consent.complete.doneButton}</Text>
          </Pressable>
        ) : (
          <>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={goBack}>
              <Text style={styles.btnGhostTxt}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary, !requiredMet(step) && styles.btnDisabled]}
              onPress={goNext}
            >
              <Text style={styles.btnPrimaryTxt}>
                {step.required ? "Agree & continue" : stepIndex === totalSteps - 1 ? "Save choices" : "Continue"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function IntroBlock() {
  const i = consent.intro;
  return (
    <View>
      <Text style={styles.eyebrow}>{i.eyebrow}</Text>
      <Text style={styles.title}>{i.title}</Text>
      <Text style={styles.body}>{i.body}</Text>
      <View style={styles.noteCard}>
        <Text style={styles.noteTxt}>{i.metaNote}</Text>
      </View>
      <Text style={styles.region}>Region detected: {consent.jurisdiction.regionLabel}</Text>
    </View>
  );
}

function ExplorationCard() {
  const ex = consent.exploration;
  return (
    <View style={styles.exCard}>
      <Text style={styles.exName}>{ex.name}</Text>
      {(ex.atAGlance || []).map((row, idx, arr) => (
        <View
          key={row.label}
          style={[styles.exRow, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
        >
          <Text style={styles.exLabel}>{row.label}</Text>
          <Text style={styles.exValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

function CompleteBlock({ draft }) {
  const c = consent.complete;
  const labels = consent.consentLabels || {};
  return (
    <View>
      <Text style={styles.eyebrow}>{c.eyebrow}</Text>
      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.body}>{c.body}</Text>

      <Text style={styles.summaryHeading}>{c.summaryHeading}</Text>
      {Object.keys(labels).map((key) => (
        <View key={key} style={styles.sumRow}>
          <Text style={[styles.sumStatus, draft[key] ? styles.sumYes : styles.sumNo]}>
            {draft[key] ? "✓" : "—"}
          </Text>
          <Text style={styles.sumLabel}>{labels[key]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  back: { color: colors.greenDark, fontFamily: fontFamily.semibold, fontSize: 16, marginRight: 8 },
  hdr: { flex: 1, fontSize: 18, fontFamily: fontFamily.semibold, color: colors.text },
  progressWrap: { paddingHorizontal: 16, paddingTop: 12 },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: colors.border, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 999, backgroundColor: colors.greenDark },
  progressTxt: { marginTop: 6, fontSize: 12, color: colors.textMuted, fontFamily: fontFamily.medium },
  eyebrow: {
    fontSize: 11,
    fontFamily: fontFamily.semibold,
    color: colors.greenDark,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6
  },
  title: { fontSize: 22, fontFamily: fontFamily.semibold, color: colors.text, marginBottom: 10, lineHeight: 28 },
  body: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 12 },
  foot: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 8, fontStyle: "italic" },
  link: { fontSize: 13, color: colors.greenDark, fontFamily: fontFamily.semibold, marginBottom: 4 },
  withdraw: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: 14,
    backgroundColor: colors.greenLight,
    borderRadius: 10,
    padding: 12
  },
  noteCard: { backgroundColor: colors.amberBg, borderRadius: 10, padding: 12, marginBottom: 12 },
  noteTxt: { fontSize: 13, color: colors.amberText, lineHeight: 19, fontFamily: fontFamily.medium },
  region: { fontSize: 12, color: colors.textMuted, fontFamily: fontFamily.medium },
  consentBlock: { marginTop: 8 },
  checkRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderMed,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1
  },
  boxOn: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  boxTick: { color: "#fff", fontSize: 14, fontFamily: fontFamily.semibold },
  checkLabel: { fontSize: 14, color: colors.text, lineHeight: 20, fontFamily: fontFamily.medium },
  checkSub: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 4 },
  req: { color: colors.orangeDark, fontFamily: fontFamily.semibold },
  exCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14
  },
  exName: { fontSize: 15, fontFamily: fontFamily.semibold, color: colors.text, marginBottom: 8, lineHeight: 21 },
  exRow: { paddingVertical: 8 },
  exLabel: {
    fontSize: 11,
    color: colors.greenDark,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: fontFamily.semibold,
    marginBottom: 2
  },
  exValue: { fontSize: 13, color: colors.text, lineHeight: 19 },
  summaryHeading: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: fontFamily.semibold,
    marginTop: 8,
    marginBottom: 10
  },
  sumRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 10 },
  sumStatus: { width: 18, fontSize: 15, fontFamily: fontFamily.semibold, textAlign: "center" },
  sumYes: { color: colors.greenDark },
  sumNo: { color: colors.borderMed },
  sumLabel: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface
  },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnGhost: { flex: 1, borderWidth: 1.5, borderColor: colors.borderMed },
  btnGhostTxt: { color: colors.text, fontFamily: fontFamily.semibold, fontSize: 14 },
  btnPrimary: { flex: 1.4, backgroundColor: colors.greenDark },
  btnPrimaryTxt: { color: "#fff", fontFamily: fontFamily.semibold, fontSize: 14 },
  btnDisabled: { opacity: 0.45 }
});
