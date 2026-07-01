import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { KindNavBar } from "../components/primitives/KindNavBar";
import { KindTabBar } from "../components/primitives/KindTabBar";
import { useData } from "../context/DataContext";
import { useProfile, avatarFromProfile, avatarToProps } from "../context/ProfileContext";
import HomeScreen from "../screens/HomeScreen";
import ExploreScreen from "../screens/ExploreScreen";
import InsightScreen from "../screens/InsightScreen";
import CommunityScreen from "../screens/CommunityScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

function TabChromeBridge({ onChrome, state, navigation, descriptors }) {
  useEffect(() => {
    onChrome({ state, navigation, descriptors });
  }, [onChrome, state.index, state.routes.length]);

  return null;
}

export default function MainTabShell() {
  const { profile } = useData();
  const { initials, avatarProps } = useProfile();
  const stackNav = useNavigation();
  const [tabChrome, setTabChrome] = useState(null);

  const apiAvatarProps = avatarToProps(avatarFromProfile(profile));
  const navProfile = {
    ...apiAvatarProps,
    ...avatarProps,
    initials: initials || profile?.navProfile?.initials || "?"
  };

  return (
    <View style={styles.root}>
      <View style={styles.chrome}>
        <KindNavBar
          profile={navProfile}
          onSearch={() => stackNav.navigate("SearchModal")}
          onNotifications={() => stackNav.navigate("NotificationsModal")}
          onAvatar={() => tabChrome?.navigation.navigate("Profile")}
        />
        {tabChrome ? <KindTabBar {...tabChrome} /> : null}
      </View>

      <View style={styles.body}>
        <Tab.Navigator tabBar={(props) => <TabChromeBridge {...props} onChrome={setTabChrome} />} screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Exploration" component={ExploreScreen} />
        <Tab.Screen name="Insight" component={InsightScreen} />
        <Tab.Screen name="Community" component={CommunityScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chrome: {
    zIndex: 10,
    elevation: 8
  },
  body: { flex: 1 }
});
