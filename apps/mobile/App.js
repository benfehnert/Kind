import React, { useMemo, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";

const Tab = createBottomTabNavigator();

const COLORS = {
  greenDark: "#22401F",
  greenLight: "#E6ECD0",
  orange: "#F4A261",
  orangeDark: "#D4743E",
  bg: "#F7F8F2",
  surface: "#FFFFFF",
  text: "#1F2A1F",
  textMuted: "#6E7A67",
  border: "#DADFD2",
  borderMed: "#C4CCBA",
  blue: "#E6F1FB",
  purple: "#EEEDFE"
};

const FEED_ITEMS = [
  {
    id: "f1",
    type: "milestone",
    title: "Sam Johnson reached week 6",
    body: "First week with average afternoon energy above 7.5 on time-restricted eating.",
    meta: "2 hours ago"
  },
  {
    id: "f2",
    type: "insight",
    title: "Your insight",
    body: "Afternoon energy is 1.6 points higher on days you log 3+ morning rules.",
    meta: "This morning"
  },
  {
    id: "f3",
    type: "science",
    title: "kind science",
    body: "78 participants in the morning rules exploration are contributing to open citizen science publications.",
    meta: "Yesterday"
  },
  {
    id: "f4",
    type: "tip",
    title: "Wellbeing tip",
    body: "Early outdoor light within 30 minutes of waking helps anchor your circadian rhythm.",
    meta: "Yesterday"
  }
];

const EXPLORATIONS = [
  {
    id: "morning-rules",
    icon: "🌅",
    category: "Energy & Focus",
    title: "Do morning rules reduce my chances of an afternoon crash?",
    desc: "8-week morning routine exploration",
    status: "active",
    progress: "Week 3 of 8"
  },
  {
    id: "eating",
    icon: "🕐",
    category: "Metabolic Health",
    title: "Does time restricted eating improve my energy levels?",
    desc: "6-week eating window exploration",
    status: "available",
    progress: "64 explorers active"
  },
  {
    id: "screen-sleep",
    icon: "📱",
    category: "Rest & Sleep",
    title: "Does moderation of screen exposure improve my sleep quality?",
    desc: "6-week screen moderation exploration",
    status: "available",
    progress: "51 explorers active"
  },
  {
    id: "relaxation",
    icon: "🧘",
    category: "Mental Health",
    title: "Do relaxation practices improve my composure?",
    desc: "6-week relaxation practices exploration",
    status: "available",
    progress: "58 explorers active"
  },
  {
    id: "upf-mood",
    icon: "🥗",
    category: "Diet & Nutrition",
    title: "Does reduction of Ultra Processed Food (UPF) improve my mood?",
    desc: "6-week UPF reduction exploration",
    status: "available",
    progress: "22 explorers active"
  }
];

const PEOPLE = [
  { id: "p1", name: "Sam Johnson", meta: "Amsterdam · Week 6", initials: "SJ" },
  { id: "p2", name: "Maya Chen", meta: "London · Week 3", initials: "MC" },
  { id: "p3", name: "Tom Richards", meta: "Amsterdam · Complete", initials: "TR" },
  { id: "p4", name: "Priya Lawson", meta: "New York · Week 4", initials: "PL" }
];

const SEARCH_INDEX = [
  "Do morning rules reduce my chances of an afternoon crash?",
  "Does time restricted eating improve my energy levels?",
  "Does moderation of screen exposure improve my sleep quality?",
  "Do relaxation practices improve my composure?",
  "Does reduction of Ultra Processed Food (UPF) improve my mood?",
  "Sam Johnson",
  "Maya Chen",
  "Community insight",
  "Citizen science"
];

function AppHeader({ onSearch, onNotifications }) {
  return (
    <View style={styles.nav}>
      <View>
        <Text style={styles.navLogo}>kind</Text>
        <Text style={styles.navSub}>health exploration</Text>
      </View>
      <View style={styles.navActions}>
        <Pressable style={styles.iconButton} onPress={onSearch}>
          <Text style={styles.iconText}>⌕</Text>
        </Pressable>
        <Pressable style={styles.iconButton} onPress={onNotifications}>
          <Text style={styles.iconText}>◉</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SearchModal({ visible, onClose }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) {
      return SEARCH_INDEX;
    }
    return SEARCH_INDEX.filter((item) => item.toLowerCase().includes(query));
  }, [q]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalPanel} onPress={() => {}}>
          <View style={styles.modalHeaderRow}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search explorations, insights, people"
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              autoFocus
            />
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>X</Text>
            </Pressable>
          </View>
          <FlatList
            data={results}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <View style={styles.searchResultRow}>
                <Text style={styles.searchResultText}>{item}</Text>
              </View>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NotificationsModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalPanel} onPress={() => {}}>
          <View style={styles.modalTitleRow}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>X</Text>
            </Pressable>
          </View>
          <View style={styles.notificationItem}>
            <Text style={styles.notificationTitle}>Sam Johnson reached week 6.</Text>
            <Text style={styles.notificationMeta}>2 hours ago</Text>
          </View>
          <View style={styles.notificationItem}>
            <Text style={styles.notificationTitle}>
              New personal insight: afternoon energy is higher on days with 3+ morning rules logged.
            </Text>
            <Text style={styles.notificationMeta}>This morning</Text>
          </View>
          <View style={styles.notificationItem}>
            <Text style={styles.notificationTitle}>
              78 participants in the morning rules exploration are contributing to a new citizen science publication.
            </Text>
            <Text style={styles.notificationMeta}>Yesterday</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function HomeScreen() {
  const [showLog, setShowLog] = useState(false);
  const [feedType, setFeedType] = useState("all");

  const feed = useMemo(
    () => FEED_ITEMS.filter((item) => (feedType === "all" ? true : item.type === feedType)),
    [feedType]
  );

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <Text style={styles.sectionTitle}>Good morning, Anna</Text>
      <Text style={styles.sectionSub}>Day 12 of your morning rules exploration.</Text>

      <View style={styles.metricGrid}>
        <MetricCard label="Afternoon energy" value="6.8" unit="/10" />
        <MetricCard label="Morning rules" value="3" unit="today" />
        <MetricCard label="Crash-free days" value="4" unit="/7" />
        <MetricCard label="Active streak" value="9" unit="days" />
      </View>

      {!showLog ? (
        <Pressable style={styles.ctaBtn} onPress={() => setShowLog(true)}>
          <Text style={styles.ctaBtnText}>Log today's data</Text>
        </Pressable>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's log</Text>
          <Text style={styles.cardBody}>This section is now native and ready for form wiring.</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => setShowLog(false)}>
            <Text style={styles.secondaryBtnText}>Hide log</Text>
          </Pressable>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {[
          { key: "all", label: "All" },
          { key: "milestone", label: "Milestones" },
          { key: "insight", label: "Insights" },
          { key: "science", label: "Science" },
          { key: "tip", label: "Tips" }
        ].map((chip) => (
          <Pressable
            key={chip.key}
            style={[styles.chip, feedType === chip.key && styles.chipActive]}
            onPress={() => setFeedType(chip.key)}
          >
            <Text style={[styles.chipText, feedType === chip.key && styles.chipTextActive]}>{chip.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {feed.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.body}</Text>
          <Text style={styles.cardMeta}>{item.meta}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function ExplorationScreen() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) {
      return EXPLORATIONS;
    }
    return EXPLORATIONS.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query) ||
        (item.category || "").toLowerCase().includes(query)
    );
  }, [q]);

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <Text style={styles.sectionTitle}>Explore</Text>
      <Text style={styles.sectionSub}>Discover and start guided health explorations.</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        style={styles.searchInputInline}
        placeholder="Find an area of health to explore"
        placeholderTextColor={COLORS.textMuted}
      />

      {filtered.map((item) => (
        <View key={item.id} style={styles.exploreCard}>
          <View style={styles.exploreIconWrap}>
            <Text style={styles.exploreIcon}>{item.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {item.category ? <Text style={styles.exploreCategory}>{item.category}</Text> : null}
            <Text style={styles.exploreTitle}>{item.title}</Text>
            <Text style={styles.exploreDesc}>{item.desc}</Text>
            <Text style={styles.exploreMeta}>{item.progress}</Text>
          </View>
          <View style={item.status === "active" ? styles.badgeAmber : styles.badgeGreen}>
            <Text style={styles.badgeText}>{item.status === "active" ? "Active" : "Start"}</Text>
          </View>
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Exploration timeline</Text>
        <Text style={styles.cardBody}>Weeks 1-2 baseline, weeks 3-5 morning rules, weeks 6-7 optimise, week 8 personalised trial analysis report.</Text>
      </View>
    </ScrollView>
  );
}

function InsightScreen() {
  const [tab, setTab] = useState("your");

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <Text style={styles.sectionTitle}>Insight</Text>
      <Text style={styles.sectionSub}>Personal findings and community science.</Text>

      <View style={styles.subTabs}>
        <Pressable style={[styles.subTab, tab === "your" && styles.subTabActive]} onPress={() => setTab("your")}>
          <Text style={[styles.subTabText, tab === "your" && styles.subTabTextActive]}>Your insights</Text>
        </Pressable>
        <Pressable
          style={[styles.subTab, tab === "community" && styles.subTabActive]}
          onPress={() => setTab("community")}
        >
          <Text style={[styles.subTabText, tab === "community" && styles.subTabTextActive]}>Community insights</Text>
        </Pressable>
      </View>

      {tab === "your" ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Afternoon energy trend</Text>
            <Text style={styles.cardBody}>Week 1: 4.8 to Week 2: 5.5 to Week 3: 6.8</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Key observations</Text>
            <Text style={styles.cardBody}>Days with 3+ morning rules correlate with higher afternoon energy.</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>From 78 participants</Text>
            <Text style={styles.cardBody}>Logging 3+ morning rules is associated with +1.6 points in afternoon energy by week 4.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Open publication pipeline</Text>
            <Text style={styles.cardBody}>2 community-backed papers currently in preparation.</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function CommunityScreen() {
  const [q, setQ] = useState("");
  const [following, setFollowing] = useState(() => new Set(["p1", "p2"]));

  const people = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) {
      return PEOPLE;
    }
    return PEOPLE.filter((p) => p.name.toLowerCase().includes(query) || p.meta.toLowerCase().includes(query));
  }, [q]);

  const toggleFollow = (id) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <Text style={styles.sectionTitle}>Community</Text>
      <Text style={styles.sectionSub}>Shared journeys, shared science.</Text>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Citizen science contribution</Text>
        <Text style={styles.bannerText}>
          Your anonymized data can contribute to open publications with community-level insights.
        </Text>
      </View>

      <TextInput
        value={q}
        onChangeText={setQ}
        style={styles.searchInputInline}
        placeholder="Search explorers"
        placeholderTextColor={COLORS.textMuted}
      />

      {people.map((p) => {
        const isFollowing = following.has(p.id);
        return (
          <View key={p.id} style={styles.personRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{p.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{p.name}</Text>
              <Text style={styles.personMeta}>{p.meta}</Text>
            </View>
            <Pressable
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              onPress={() => toggleFollow(p.id)}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

function ProfileScreen() {
  const [shareData, setShareData] = useState(true);
  const [visibleCommunity, setVisibleCommunity] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(true);

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <Text style={styles.sectionTitle}>Profile</Text>
      <Text style={styles.sectionSub}>Emma Green · Amsterdam</Text>

      <View style={styles.metricGrid}>
        <MetricCard label="Following" value="25" unit="" />
        <MetricCard label="Followers" value="40" unit="" />
        <MetricCard label="Sleep score" value="7.4" unit="/10" />
        <MetricCard label="Logs" value="12" unit="" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data & privacy</Text>
        <SettingRow
          title="Contribute to citizen science"
          subtitle="Anonymized data used in open publications"
          value={shareData}
          onValueChange={setShareData}
        />
        <SettingRow
          title="Visible in community"
          subtitle="Others can view your progress"
          value={visibleCommunity}
          onValueChange={setVisibleCommunity}
        />
        <SettingRow
          title="Daily reminders"
          subtitle="Gentle nudges to log each morning"
          value={dailyReminders}
          onValueChange={setDailyReminders}
          noBorder
        />
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, unit }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value}
        <Text style={styles.metricUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

function SettingRow({ title, subtitle, value, onValueChange, noBorder }) {
  return (
    <View style={[styles.settingRow, noBorder && { borderBottomWidth: 0 }]}> 
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSub}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: COLORS.greenDark }} />
    </View>
  );
}

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <AppHeader onSearch={() => setSearchOpen(true)} onNotifications={() => setNotificationsOpen(true)} />
        <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
        <NotificationsModal visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: COLORS.greenDark,
              tabBarInactiveTintColor: COLORS.textMuted,
              tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border }
            }}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Exploration" component={ExplorationScreen} />
            <Tab.Screen name="Insight" component={InsightScreen} />
            <Tab.Screen name="Community" component={CommunityScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg
  },
  nav: {
    backgroundColor: COLORS.greenDark,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  navLogo: {
    color: "white",
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 30
  },
  navSub: {
    color: COLORS.orange,
    fontSize: 11,
    letterSpacing: 0.5
  },
  navActions: {
    flexDirection: "row",
    gap: 8
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  iconText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700"
  },
  screenPad: {
    padding: 16,
    paddingBottom: 120
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700"
  },
  sectionSub: {
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 20
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12
  },
  metricCard: {
    width: "48%",
    backgroundColor: COLORS.greenLight,
    borderRadius: 10,
    padding: 10
  },
  metricLabel: {
    color: COLORS.greenDark,
    fontSize: 11,
    marginBottom: 6
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "700"
  },
  metricUnit: {
    color: COLORS.textMuted,
    fontSize: 12
  },
  ctaBtn: {
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 12
  },
  ctaBtnText: {
    color: "white",
    fontWeight: "700"
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6
  },
  cardBody: {
    color: COLORS.textMuted,
    lineHeight: 20
  },
  cardMeta: {
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: 12
  },
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.borderMed,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center"
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontWeight: "600"
  },
  chipRow: {
    marginBottom: 12
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.borderMed,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: COLORS.surface
  },
  chipActive: {
    backgroundColor: COLORS.greenDark,
    borderColor: COLORS.greenDark
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: 12
  },
  chipTextActive: {
    color: "white"
  },
  exploreCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10
  },
  exploreIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.greenLight,
    alignItems: "center",
    justifyContent: "center"
  },
  exploreIcon: {
    fontSize: 20
  },
  exploreCategory: {
    color: COLORS.greenDark,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2
  },
  exploreTitle: {
    color: COLORS.text,
    fontWeight: "700"
  },
  exploreDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  exploreMeta: {
    color: COLORS.greenDark,
    fontSize: 11,
    marginTop: 5,
    fontWeight: "600"
  },
  badgeAmber: {
    backgroundColor: "#FDF0E4",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  badgeGreen: {
    backgroundColor: COLORS.greenLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  badgeText: {
    color: COLORS.greenDark,
    fontSize: 11,
    fontWeight: "700"
  },
  subTabs: {
    flexDirection: "row",
    borderColor: COLORS.borderMed,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12
  },
  subTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: COLORS.surface
  },
  subTabActive: {
    backgroundColor: COLORS.greenDark
  },
  subTabText: {
    color: COLORS.textMuted,
    fontWeight: "600",
    fontSize: 12
  },
  subTabTextActive: {
    color: "white"
  },
  banner: {
    backgroundColor: COLORS.greenLight,
    borderColor: COLORS.borderMed,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  bannerTitle: {
    color: COLORS.greenDark,
    fontWeight: "700",
    marginBottom: 4
  },
  bannerText: {
    color: COLORS.greenDark,
    lineHeight: 19
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    paddingVertical: 10,
    gap: 10
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.greenLight,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: COLORS.greenDark,
    fontWeight: "700"
  },
  personName: {
    color: COLORS.text,
    fontWeight: "700"
  },
  personMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  followBtn: {
    borderWidth: 1,
    borderColor: COLORS.greenDark,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6
  },
  followBtnActive: {
    backgroundColor: COLORS.greenDark
  },
  followBtnText: {
    color: COLORS.greenDark,
    fontWeight: "700",
    fontSize: 12
  },
  followBtnTextActive: {
    color: "white"
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  settingTitle: {
    color: COLORS.text,
    fontWeight: "600"
  },
  settingSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start"
  },
  modalPanel: {
    marginTop: 70,
    marginHorizontal: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    maxHeight: "80%",
    padding: 10
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8
  },
  modalTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text
  },
  searchInputInline: {
    borderWidth: 1,
    borderColor: COLORS.borderMed,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    color: COLORS.text
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg
  },
  closeBtnText: {
    color: COLORS.textMuted,
    fontWeight: "700"
  },
  searchResultRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 4
  },
  searchResultText: {
    color: COLORS.text
  },
  notificationItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10
  },
  notificationTitle: {
    color: COLORS.text,
    lineHeight: 20
  },
  notificationMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 3
  }
});
