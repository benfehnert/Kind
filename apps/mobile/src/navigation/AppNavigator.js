import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SearchModalScreen from "../screens/SearchModalScreen";
import NotificationsModalScreen from "../screens/NotificationsModalScreen";
import ExplorationDetailScreen from "../screens/ExplorationDetailScreen";
import EvidenceScreen from "../screens/EvidenceScreen";
import ExplorerProfileScreen from "../screens/ExplorerProfileScreen";
import ResearcherProfileScreen from "../screens/ResearcherProfileScreen";
import FeedBankScreen from "../screens/FeedBankScreen";
import ExplorersListScreen from "../screens/ExplorersListScreen";
import FollowListScreen from "../screens/FollowListScreen";
import MainTabShell from "./MainTabShell";

const RootStack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
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
      <RootStack.Screen name="Evidence" component={EvidenceScreen} />
      <RootStack.Screen name="ExplorerProfile" component={ExplorerProfileScreen} />
      <RootStack.Screen name="ResearcherProfile" component={ResearcherProfileScreen} />
      <RootStack.Screen name="FeedBank" component={FeedBankScreen} />
      <RootStack.Screen name="ExplorersList" component={ExplorersListScreen} />
      <RootStack.Screen name="FollowList" component={FollowListScreen} />
    </RootStack.Navigator>
  );
}
