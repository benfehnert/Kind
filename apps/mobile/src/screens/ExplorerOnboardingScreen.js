import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useOnboarding } from "../context/OnboardingContext";
import { useConsent } from "../context/ConsentContext";
import { useUiShell } from "../context/UiContext";
import {
  getProgressIndex,
  getProgressStepCount,
  getVisibleSteps,
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
  renderNotificationsStep,
  renderCreateAccountStep
} from "../components/onboarding/stepRenderers";

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

  const visibleSteps = useMemo(() => getVisibleSteps(answers), [answers]);
  const step = visibleSteps[stage];
  const isCreateAccount = step?.type === "createAccount";
  const canContinue = validateStep(step, answers);
  const progressTotal = getProgressStepCount(visibleSteps);

  useEffect(() => {
    setStage((s) => Math.min(s, Math.max(visibleSteps.length - 1, 0)));
  }, [visibleSteps.length]);

  const handleChange = useCallback(
    (key, value) => {
      if (key === "remindersEnabled" && value !== true) {
        updateAnswers({ [key]: value, notificationsSetup: null });
        return;
      }
      updateAnswers({ [key]: value });
    },
    [updateAnswers]
  );

  const goNext = useCallback(() => {
    if (!canContinue) return;
    if (stage >= visibleSteps.length - 1) return;
    setStage((s) => s + 1);
  }, [canContinue, stage, visibleSteps.length]);

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
      case "notifications":
        return renderNotificationsStep(step, answers, handleChange);
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
      progressCurrent={getProgressIndex(visibleSteps, stage)}
      progressTotal={progressTotal}
      continueLabel={step?.continueLabel}
      continueDisabled={!canContinue}
      onContinue={goNext}
      hideFooter={isCreateAccount}
    >
      {renderStep()}
    </OnboardingShell>
  );
}
