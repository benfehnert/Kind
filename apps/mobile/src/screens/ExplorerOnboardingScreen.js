import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePostHog } from "posthog-react-native";
import { identifyPostHogUser } from "../lib/posthog";
import { useOnboarding } from "../context/OnboardingContext";
import { useAuth } from "../context/AuthContext";
import { useConsent } from "../context/ConsentContext";
import { useUiShell } from "../context/UiContext";
import { ApiError } from "../lib/api";
import {
  getProgressIndex,
  getProgressStepCount,
  getVisibleSteps,
  validateStep
} from "../data/explorerOnboarding";
import { OnboardingShell } from "../components/onboarding/OnboardingShell";
import { AuthChoiceStep } from "../components/onboarding/AuthChoiceStep";
import { LoginOnboardingStep } from "../components/onboarding/LoginOnboardingStep";
import {
  renderWelcomeStep,
  renderSignupStep,
  renderMessageStep,
  renderYesNoStep,
  renderTextStep,
  renderYearStep,
  renderSingleSelectStep,
  renderMultiSelectStep,
  renderRemindersStep,
  renderNotificationsStep,
  renderFinishStep
} from "../components/onboarding/stepRenderers";

function mapAnswersToConsent(answers) {
  return {
    platform_participation: Boolean(answers.consentPrivacy),
    research_contribution: Boolean(answers.consentCitizenScience),
    result_sharing: Boolean(answers.consentDiscoverable)
  };
}

export default function ExplorerOnboardingScreen() {
  const posthog = usePostHog();
  const { answers, updateAnswers, completeOnboarding } = useOnboarding();
  const { isAuthenticated, signup, login } = useAuth();
  const { saveConsent, syncFromOnboarding } = useConsent();
  const { showToast } = useUiShell();
  const [stage, setStage] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [signupError, setSignupError] = useState("");

  const visibleSteps = useMemo(
    () => getVisibleSteps(answers, { isAuthenticated }),
    [answers, isAuthenticated]
  );
  const step = visibleSteps[stage];
  const isFinish = step?.type === "finish";
  const canContinue = validateStep(step, answers);
  const progressTotal = getProgressStepCount(visibleSteps);
  const busy = finishing || advancing;
  const footerHidden = step?.type === "authChoice" || step?.type === "login";

  useEffect(() => {
    setStage((s) => Math.min(s, Math.max(visibleSteps.length - 1, 0)));
  }, [visibleSteps.length]);

  const goToStepId = useCallback(
    (id) => {
      const idx = visibleSteps.findIndex((s) => s.id === id);
      if (idx >= 0) {
        setSignupError("");
        setStage(idx);
      }
    },
    [visibleSteps]
  );

  const handleChange = useCallback(
    (key, value) => {
      if (key === "signupEmail" || key === "signupPassword") {
        setSignupError("");
      }
      if (key === "remindersEnabled" && value !== true) {
        updateAnswers({ [key]: value, notificationsSetup: null });
        return;
      }
      if (value === true && answers[key] !== true) {
        if (key === "consentPrivacy") posthog?.capture("onboarding master consent");
        if (key === "consentCitizenScience") posthog?.capture("onboarding citizen science consent");
        if (key === "consentDiscoverable") posthog?.capture("onboarding community consent");
      }
      updateAnswers({ [key]: value });
    },
    [answers, posthog, updateAnswers]
  );

  const goNext = useCallback(async () => {
    if (!canContinue || busy) return;
    if (stage >= visibleSteps.length - 1) return;

    if (step?.type === "signup") {
      setAdvancing(true);
      setSignupError("");
      try {
        const email = answers.signupEmail.trim();
        const name = (answers.name || "").trim() || email.split("@")[0];
        await signup(email, name, answers.signupPassword);
        updateAnswers({
          signupEmail: email,
          signupPassword: answers.signupPassword
        });
        // Advancing past signup is handled by the auth effect once
        // isAuthenticated flips true.
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        setSignupError(message);
      } finally {
        setAdvancing(false);
      }
      return;
    }

    setStage((s) => s + 1);
  }, [
    answers.name,
    answers.signupEmail,
    answers.signupPassword,
    busy,
    canContinue,
    signup,
    stage,
    step?.type,
    updateAnswers,
    visibleSteps.length
  ]);

  const handleLogin = useCallback(
    async (loginEmail, loginPassword) => {
      await login(loginEmail, loginPassword);
      identifyPostHogUser(posthog, loginEmail);
      posthog?.capture("signed in");
    },
    [login, posthog]
  );

  const goBack = useCallback(() => {
    if (stage <= 0) return;
    setSignupError("");
    if (step?.type === "signup" || step?.type === "login") {
      const idx = visibleSteps.findIndex((s) => s.id === "auth-choice");
      setStage(idx >= 0 ? idx : stage - 1);
      return;
    }
    setStage((s) => s - 1);
  }, [stage, step?.type, visibleSteps]);

  const handleFinish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      saveConsent(mapAnswersToConsent(answers));
      await syncFromOnboarding(answers);
      await completeOnboarding(answers);
      posthog?.capture("onboarding completed");
      showToast("You're all set — welcome to Kind.");
    } catch {
      showToast("Something went wrong saving your answers. Please try again.");
    } finally {
      setFinishing(false);
    }
  }, [answers, completeOnboarding, finishing, posthog, saveConsent, showToast, syncFromOnboarding]);

  const renderStep = () => {
    if (!step) return null;

    switch (step.type) {
      case "welcome":
        return renderWelcomeStep();
      case "authChoice":
        return (
          <AuthChoiceStep
            onCreateAccount={() => goToStepId("signup")}
            onLogin={() => goToStepId("login")}
          />
        );
      case "login":
        return (
          <LoginOnboardingStep
            onSubmit={handleLogin}
            onSwitchToCreate={() => goToStepId("signup")}
          />
        );
      case "signup":
        return renderSignupStep(step, answers, handleChange, signupError);
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
      case "finish":
        return renderFinishStep(step, answers);
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
      continueLabel={
        step?.type === "signup" && advancing ? "Creating account…" : step?.continueLabel
      }
      continueDisabled={!canContinue || busy}
      onContinue={isFinish ? handleFinish : goNext}
      hideFooter={footerHidden}
    >
      {renderStep()}
    </OnboardingShell>
  );
}
