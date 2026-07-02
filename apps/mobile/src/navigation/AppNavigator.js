import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useOnboarding } from "../context/OnboardingContext";
import { colors } from "../theme/colors";
import SearchModalScreen from "../screens/SearchModalScreen";
import NotificationsModalScreen from "../screens/NotificationsModalScreen";
import ExplorationDetailScreen from "../screens/ExplorationDetailScreen";
import EvidenceScreen from "../screens/EvidenceScreen";
import ExplorerProfileScreen from "../screens/ExplorerProfileScreen";
import ResearcherProfileScreen from "../screens/ResearcherProfileScreen";
import FeedBankScreen from "../screens/FeedBankScreen";
import ExplorersListScreen from "../screens/ExplorersListScreen";
import FollowListScreen from "../screens/FollowListScreen";
import NiceSupportersScreen from "../screens/NiceSupportersScreen";
import ActivityMessagesScreen from "../screens/ActivityMessagesScreen";
import OnboardingConsentScreen from "../screens/OnboardingConsentScreen";
import ConsentSummaryScreen from "../screens/ConsentSummaryScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";
import ResearchEthicsScreen from "../screens/ResearchEthicsScreen";
import DataUsageScreen from "../screens/DataUsageScreen";
import DownloadDataScreen from "../screens/DownloadDataScreen";
import ExplorerOnboardingScreen from "../screens/ExplorerOnboardingScreen";
import ExplorationConsentScreen from "../screens/ExplorationConsentScreen";
import ExplorationStartedScreen from "../screens/ExplorationStartedScreen";
import EnergyReportScreen from "../screens/EnergyReportScreen";
import ExplorationReportScreen from "../screens/ExplorationReportScreen";
import MainTabShell from "./MainTabShell";

const RootStack = createNativeStackNavigator();

export default function AppNavigator() {
  const { completed, hydrating } = useOnboarding();

  if (hydrating) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.greenDark} />
      </View>
    );
  }

  return (
    <RootStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={completed ? "MainTabs" : "ExplorerOnboarding"}
    >
      <RootStack.Screen name="ExplorerOnboarding" component={ExplorerOnboardingScreen} />
      <RootStack.Screen name="MainTabs" component={MainTabShell} />
      <RootStack.Screen
        name="SearchModal"
        component={SearchModalScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <RootStack.Screen
        name="NotificationsModal"
        component={NotificationsModalScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <RootStack.Screen name="ExplorationDetail" component={ExplorationDetailScreen} />
      <RootStack.Screen name="ExplorationConsent" component={ExplorationConsentScreen} />
      <RootStack.Screen name="ExplorationStarted" component={ExplorationStartedScreen} />
      <RootStack.Screen name="Evidence" component={EvidenceScreen} />
      <RootStack.Screen name="ExplorerProfile" component={ExplorerProfileScreen} />
      <RootStack.Screen name="ResearcherProfile" component={ResearcherProfileScreen} />
      <RootStack.Screen name="FeedBank" component={FeedBankScreen} />
      <RootStack.Screen name="ExplorersList" component={ExplorersListScreen} />
      <RootStack.Screen name="FollowList" component={FollowListScreen} />
      <RootStack.Screen name="NiceSupporters" component={NiceSupportersScreen} />
      <RootStack.Screen name="ActivityMessages" component={ActivityMessagesScreen} />
      <RootStack.Screen name="OnboardingConsent" component={OnboardingConsentScreen} />
      <RootStack.Screen name="ConsentSummary" component={ConsentSummaryScreen} />
      <RootStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <RootStack.Screen name="ResearchEthics" component={ResearchEthicsScreen} />
      <RootStack.Screen name="DataUsage" component={DataUsageScreen} />
      <RootStack.Screen name="DownloadData" component={DownloadDataScreen} />
      <RootStack.Screen name="ExplorationReport" component={ExplorationReportScreen} />
      <RootStack.Screen name="EnergyReport" component={EnergyReportScreen} />
    </RootStack.Navigator>
  );
}
