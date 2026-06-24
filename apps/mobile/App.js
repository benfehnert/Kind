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
import { ConsentProvider } from "./src/context/ConsentContext";
import { ProfileProvider } from "./src/context/ProfileContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { OnboardingProvider, useOnboarding } from "./src/context/OnboardingContext";
import { UiProvider, useUiShell } from "./src/context/UiContext";
import AppNavigator from "./src/navigation/AppNavigator";
import AuthNavigator from "./src/navigation/AuthNavigator";
import { ProtoAppFrame } from "./src/components/ProtoAppFrame";
import { ProtoToast } from "./src/components/ProtoToast";

function AppShell() {
  const { toast } = useUiShell();
  const { completed, hydrating } = useOnboarding();
  const inOnboarding = !hydrating && !completed;

  return (
    <>
      <StatusBar style={inOnboarding ? "dark" : "light"} />
      <AppNavigator />
      <ProtoToast message={toast} visible={!!toast} />
    </>
  );
}

function AuthenticatedApp() {
  return (
    <DataProvider>
      <FollowProvider>
        <OnboardingProvider>
          <ConsentProvider>
            <ProfileProvider>
              <UiProvider>
                <AppShell />
              </UiProvider>
            </ProfileProvider>
          </ConsentProvider>
        </OnboardingProvider>
      </FollowProvider>
    </DataProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, hydrating } = useAuth();

  if (hydrating) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F8F2" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style="dark" />
        <AuthNavigator />
      </>
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
            <RootNavigator />
          </NavigationContainer>
        </ProtoAppFrame>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
