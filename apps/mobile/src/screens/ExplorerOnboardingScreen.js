import React, { useCallback, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useNavigation } from "@react-navigation/native";
import { useOnboarding } from "../context/OnboardingContext";
import { useConsent } from "../context/ConsentContext";
import { useUiShell } from "../context/UiContext";
import {
  ONBOARDING_STEPS,
  PROGRESS_STEP_COUNT,
  getProgressIndex,
  validateStep
} from "../data/explorerOnboarding";
import { OnboardingShell } from "../components/onboarding/OnboardingShell";
import {
  renderWelcomeStep,
  renderMessageStep,
  renderYesNoStep,
  renderTextStep,
  renderYearStep,
  renderSingleSelectStep,
  renderMultiSelectStep,
  renderRemindersStep,
  renderCreateAccountStep
} from "../components/onboarding/stepRenderers";

async function requestReminderPermission() {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function mapAnswersToConsent(answers) {
  return {
    platform_participation: Boolean(answers.consentPrivacy),
    research_contribution: Boolean(answers.consentCitizenScience),
    result_sharing: Boolean(answers.consentDiscoverable)
  };
}

export default function ExplorerOnboardingScreen() {
  const navigation = useNavigation();
  const { answers, updateAnswers, completeOnboarding } = useOnboarding();
  const { saveConsent, syncFromOnboarding } = useConsent();
  const { showToast } = useUiShell();
  const [stage, setStage] = useState(0);

  const step = ONBOARDING_STEPS[stage];
  const isCreateAccount = step?.type === "createAccount";
  const canContinue = validateStep(step, answers);

  const handleChange = useCallback(
    (key, value) => {
      updateAnswers({ [key]: value });
    },
    [updateAnswers]
  );

  const goNext = useCallback(async () => {
    if (!canContinue) return;

    if (step.type === "reminders" && answers.remindersEnabled === true) {
      if (Platform.OS === "web") {
        showToast("Daily reminders are available in the iOS and Android apps.");
      } else {
        await requestReminderPermission();
      }
    }

    if (stage >= ONBOARDING_STEPS.length - 1) return;
    setStage((s) => s + 1);
  }, [canContinue, step, answers.remindersEnabled, stage, showToast]);

  const goBack = useCallback(() => {
    if (stage <= 0) return;
    setStage((s) => s - 1);
  }, [stage]);

  const handleGoogleSignUp = useCallback(() => {
    saveConsent(mapAnswersToConsent(answers));
    syncFromOnboarding(answers);
    completeOnboarding(answers);
    showToast("Account creation coming soon — your answers are saved locally.");
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  }, [answers, completeOnboarding, navigation, saveConsent, syncFromOnboarding, showToast]);

  const renderStep = () => {
    if (!step) return null;

    switch (step.type) {
      case "welcome":
        return renderWelcomeStep();
      case "message":
        return renderMessageStep(step);
      case "yesNo":
        return renderYesNoStep(step, answers, handleChange);
      case "text":
        return renderTextStep(step, answers, handleChange);
      case "year":
        return renderYearStep(step, answers, handleChange);
      case "singleSelect":
        return renderSingleSelectStep(step, answers, handleChange);
      case "multiSelect":
        return renderMultiSelectStep(step, answers, handleChange);
      case "reminders":
        return renderRemindersStep(step, answers, handleChange);
      case "createAccount":
        return renderCreateAccountStep(step, answers, handleGoogleSignUp);
      default:
        return null;
    }
  };

  return (
    <OnboardingShell
      showBack={stage > 0}
      onBack={goBack}
      showProgress={step?.showProgress}
      progressCurrent={getProgressIndex(stage)}
      progressTotal={PROGRESS_STEP_COUNT}
      continueLabel={step?.continueLabel}
      continueDisabled={!canContinue}
      onContinue={goNext}
      hideFooter={isCreateAccount}
    >
      {renderStep()}
    </OnboardingShell>
  );
}
