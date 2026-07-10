import "react-native-gesture-handler";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  AlbertSans_400Regular,
  AlbertSans_500Medium,
  AlbertSans_600SemiBold
} from "@expo-google-fonts/albert-sans";
import { Onest_700Bold } from "@expo-google-fonts/onest";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { DataProvider } from "./src/context/DataContext";
import { FollowProvider } from "./src/context/FollowContext";
import { ConsentProvider, useConsent } from "./src/context/ConsentContext";
import { ProfileProvider } from "./src/context/ProfileContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { OnboardingProvider, useOnboarding } from "./src/context/OnboardingContext";
import { UiProvider, useUiShell } from "./src/context/UiContext";
import AppNavigator from "./src/navigation/AppNavigator";
import AuthNavigator from "./src/navigation/AuthNavigator";
import ExplorerOnboardingScreen from "./src/screens/ExplorerOnboardingScreen";
import GlobalConsentRequiredScreen from "./src/screens/GlobalConsentRequiredScreen";
import CommunityVisibilityWithdrawnScreen from "./src/screens/CommunityVisibilityWithdrawnScreen";
import { PostHogRoot } from "./src/components/PostHogRoot";
import { ProtoAppFrame } from "./src/components/ProtoAppFrame";
import { ProtoToast } from "./src/components/ProtoToast";
import { FeedbackFab } from "./src/components/FeedbackFab";

function AppShell() {
  const { toast } = useUiShell();
  const { completed, hydrating } = useOnboarding();
  const { privacyPrefs, prefsHydrating, communityWithdrawNotice, communityNoticeHydrating } = useConsent();
  const inOnboarding = !hydrating && !completed;
  const blockedForConsent = !inOnboarding && !prefsHydrating && !privacyPrefs.globalConsent;
  const blockedForCommunityWithdraw =
    !inOnboarding &&
    !prefsHydrating &&
    !communityNoticeHydrating &&
    communityWithdrawNotice &&
    privacyPrefs.globalConsent;

  if (blockedForConsent) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <GlobalConsentRequiredScreen />
        <ProtoToast message={toast} visible={!!toast} />
      </View>
    );
  }

  if (blockedForCommunityWithdraw) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <CommunityVisibilityWithdrawnScreen />
        <ProtoToast message={toast} visible={!!toast} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={inOnboarding ? "dark" : "light"} />
      <AppNavigator />
      <ProtoToast message={toast} visible={!!toast} />
      <FeedbackFab />
    </View>
  );
}

function OnboardingFlow() {
  const { toast } = useUiShell();

  return (
    <>
      <StatusBar style="dark" />
      <ExplorerOnboardingScreen />
      <ProtoToast message={toast} visible={!!toast} />
    </>
  );
}

function AuthenticatedApp() {
  return (
    <DataProvider>
      <FollowProvider>
        <ConsentProvider>
          <ProfileProvider>
            <UiProvider>
              <AppShell />
            </UiProvider>
          </ProfileProvider>
        </ConsentProvider>
      </FollowProvider>
    </DataProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, hydrating: authHydrating } = useAuth();
  const { completed, hydrating: onboardingHydrating } = useOnboarding();

  if (authHydrating || onboardingHydrating) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F8F2" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Auth-first: unauthenticated users always land on login / sign up.
  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style="dark" />
        <AuthNavigator />
      </>
    );
  }

  // Onboarding is only reachable right after a new account is created, i.e.
  // when the user is authenticated but has not yet completed onboarding.
  // Returning users hydrate as completed and skip straight to the app.
  if (!completed) {
    return (
      <ConsentProvider>
        <UiProvider>
          <OnboardingFlow />
        </UiProvider>
      </ConsentProvider>
    );
  }

  return <AuthenticatedApp />;
}

export default function App() {
  const [loaded] = useFonts({
    AlbertSans_400Regular,
    AlbertSans_500Medium,
    AlbertSans_600SemiBold,
    Onest_700Bold
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F8F2" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <ProtoAppFrame>
          <NavigationContainer>
            <PostHogRoot>
              <OnboardingProvider>
                <RootNavigator />
              </OnboardingProvider>
            </PostHogRoot>
          </NavigationContainer>
        </ProtoAppFrame>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
