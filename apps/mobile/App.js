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
import { OnboardingProvider, useOnboarding } from "./src/context/OnboardingContext";
import { UiProvider, useUiShell } from "./src/context/UiContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { ProtoAppFrame } from "./src/components/ProtoAppFrame";
import { ProtoToast } from "./src/components/ProtoToast";

function Shell() {
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
    <DataProvider>
    <FollowProvider>
      <OnboardingProvider>
      <ConsentProvider>
        <ProfileProvider>
        <UiProvider>
          <SafeAreaProvider>
            <ProtoAppFrame>
              <NavigationContainer>
                <Shell />
              </NavigationContainer>
            </ProtoAppFrame>
          </SafeAreaProvider>
        </UiProvider>
        </ProfileProvider>
      </ConsentProvider>
      </OnboardingProvider>
    </FollowProvider>
    </DataProvider>
  );
}
