import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";

const API_BASE_URL = "http://localhost:4000";
const Tab = createBottomTabNavigator();

// Set to true to preview the UI without a running backend
const DEMO_MODE = true;

const MOCK_DAILY = [
  { date: "2026-04-20", completed_count: 4, total_count: 5, adherence_rate: 0.8 },
  { date: "2026-04-21", completed_count: 3, total_count: 5, adherence_rate: 0.6 },
  { date: "2026-04-22", completed_count: 5, total_count: 5, adherence_rate: 1.0 },
  { date: "2026-04-23", completed_count: 2, total_count: 5, adherence_rate: 0.4 },
  { date: "2026-04-24", completed_count: 4, total_count: 5, adherence_rate: 0.8 },
  { date: "2026-04-25", completed_count: 0, total_count: 0, adherence_rate: 0 },
  { date: "2026-04-26", completed_count: 0, total_count: 0, adherence_rate: 0 }
];
const MOCK_CATEGORIES = [
  { category: "sleep",     completed_count: 8,  total_count: 10, adherence_rate: 0.8 },
  { category: "stress",    completed_count: 6,  total_count: 10, adherence_rate: 0.6 },
  { category: "movement",  completed_count: 9,  total_count: 10, adherence_rate: 0.9 },
  { category: "nutrition", completed_count: 5,  total_count: 10, adherence_rate: 0.5 }
];
const MOCK_WEEKLY = { completed_count: 18, total_count: 25, weekly_adherence: 0.72 };
const MOCK_NUDGE = "You're doing great — 72% adherence is solid progress! Your movement habit is especially strong this week at 90%. Keep it up, and try nudging your nutrition consistency just a little higher next week.";

async function demoApiFetch(path) {
  await new Promise((r) => setTimeout(r, 400));
  const make = (body) => ({ ok: true, json: async () => body });
  if (path.startsWith("/adherence/daily"))      return make(MOCK_DAILY);
  if (path.startsWith("/adherence/categories")) return make(MOCK_CATEGORIES);
  if (path.startsWith("/adherence/weekly"))     return make(MOCK_WEEKLY);
  if (path.startsWith("/coaching/nudge"))       return make({ nudge: MOCK_NUDGE });
  if (path.startsWith("/plans/today"))          return make({ plan: null, items: [] });
  if (path.startsWith("/protocols"))            return make({ items: [] });
  return { ok: false, status: 404, json: async () => ({}) };
}
const GOAL_OPTIONS = [
  { key: "better_sleep", label: "Better sleep" },
  { key: "reduce_stress", label: "Reduce stress" },
  { key: "more_energy", label: "More energy" },
  { key: "improve_fitness", label: "Improve fitness" },
  { key: "improve_nutrition", label: "Improve nutrition" }
];

function TodayScreen({ apiFetch }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  async function loadToday() {
    try {
      setLoading(true);
      setError("");
      const response = await apiFetch("/plans/today");
      if (!response.ok) {
        throw new Error("Failed to load today plan");
      }
      const json = await response.json();
      setItems(json.items || []);
    } catch (_err) {
      setError("Unable to fetch today plan. Check API and network settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadToday();
  }, []);

  async function updateItemStatus(itemId, status) {
    await apiFetch(`/plan-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await loadToday();
  }

  async function generateTodayPlan() {
    await apiFetch("/plans/generate", { method: "POST" });
    await loadToday();
  }

  if (loading) {
    return (
      <ScreenLayout title="Today">
        <ActivityIndicator />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Today">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.generateButtonWrap}>
        <Button title="Generate Today Plan" onPress={generateTodayPlan} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text>No plan items yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardText}>{item.instructions}</Text>
            <Text style={styles.cardText}>Status: {item.status}</Text>
            <View style={styles.row}>
              <Button title="Done" onPress={() => updateItemStatus(item.id, "done")} />
              <Button title="Partial" onPress={() => updateItemStatus(item.id, "partial")} />
              <Button title="Skip" onPress={() => updateItemStatus(item.id, "skipped")} />
            </View>
          </View>
        )}
      />
    </ScreenLayout>
  );
}

const CATEGORY_LABELS = {
  sleep: "😴 Sleep",
  stress: "🧘 Stress",
  movement: "🏃 Movement",
  nutrition: "🥗 Nutrition"
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const BAR_MAX_HEIGHT = 80;

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function shiftWeek(weekStart, days) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function ProgressScreen({ apiFetch }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [dailyData, setDailyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState({ adherence: 0, daysActive: 0, itemsDone: 0 });
  const [nudge, setNudge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nudgeLoading, setNudgeLoading] = useState(false);

  const currentWeek = getMonday(new Date());
  const isCurrentWeek = weekStart === currentWeek;

  async function fetchNudge(ws, weeklyAdherence, categories) {
    try {
      setNudgeLoading(true);
      const res = await apiFetch("/coaching/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_start: ws,
          weekly_adherence: Number(weeklyAdherence),
          categories: categories.map((c) => ({
            category: c.category,
            adherence_rate: Number(c.adherence_rate)
          }))
        })
      });
      if (res.ok) {
        const json = await res.json();
        setNudge(json.nudge || null);
      }
    } catch (_err) {
      // nudge is optional; stay hidden on failure
    } finally {
      setNudgeLoading(false);
    }
  }

  async function loadData(ws) {
    try {
      setLoading(true);
      setNudge(null);
      const [dailyRes, catRes, weeklyRes] = await Promise.all([
        apiFetch(`/adherence/daily?week_start=${ws}`),
        apiFetch(`/adherence/categories?week_start=${ws}`),
        apiFetch(`/adherence/weekly?week_start=${ws}`)
      ]);

      const daily = dailyRes.ok ? await dailyRes.json() : [];
      const categories = catRes.ok ? await catRes.json() : [];
      const weekly = weeklyRes.ok ? await weeklyRes.json() : {};

      const safeDaily = Array.isArray(daily) ? daily : [];
      const safeCats = Array.isArray(categories) ? categories : [];

      setDailyData(safeDaily);
      setCategoryData(safeCats);

      const daysActive = safeDaily.filter((d) => Number(d.total_count) > 0).length;
      const itemsDone = safeDaily.reduce((s, d) => s + Number(d.completed_count), 0);
      const adherence = weekly.weekly_adherence != null ? Number(weekly.weekly_adherence) : 0;

      setWeeklyStats({ adherence, daysActive, itemsDone });

      const totalItems = safeDaily.reduce((s, d) => s + Number(d.total_count), 0);
      if (totalItems > 0) {
        fetchNudge(ws, adherence, safeCats);
      }
    } catch (_err) {
      setDailyData([]);
      setCategoryData([]);
      setWeeklyStats({ adherence: 0, daysActive: 0, itemsDone: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(weekStart);
  }, [weekStart]);

  return (
    <ScreenLayout title="Progress">
      <View style={progressStyles.weekNav}>
        <Pressable style={progressStyles.navBtn} onPress={() => setWeekStart(shiftWeek(weekStart, -7))}>
          <Text style={progressStyles.navBtnText}>‹ Prev</Text>
        </Pressable>
        <Text style={progressStyles.weekLabel}>{weekStart}</Text>
        <Pressable
          style={[progressStyles.navBtn, isCurrentWeek && progressStyles.navBtnDisabled]}
          onPress={() => !isCurrentWeek && setWeekStart(shiftWeek(weekStart, 7))}
          disabled={isCurrentWeek}
        >
          <Text style={[progressStyles.navBtnText, isCurrentWeek && progressStyles.navBtnTextDisabled]}>
            Next ›
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={progressStyles.statsRow}>
            <View style={progressStyles.statCard}>
              <Text style={progressStyles.statValue}>{Math.round(weeklyStats.adherence * 100)}%</Text>
              <Text style={progressStyles.statLabel}>Adherence</Text>
            </View>
            <View style={progressStyles.statCard}>
              <Text style={progressStyles.statValue}>{weeklyStats.daysActive}</Text>
              <Text style={progressStyles.statLabel}>Days Active</Text>
            </View>
            <View style={progressStyles.statCard}>
              <Text style={progressStyles.statValue}>{weeklyStats.itemsDone}</Text>
              <Text style={progressStyles.statLabel}>Items Done</Text>
            </View>
          </View>

          <View style={progressStyles.card}>
            <Text style={progressStyles.sectionTitle}>Daily Adherence</Text>
            <View style={progressStyles.barChart}>
              {DAY_LABELS.map((label, i) => {
                const day = dailyData[i];
                const rate = day ? Number(day.adherence_rate) : 0;
                const hasData = day && Number(day.total_count) > 0;
                const barHeight = hasData ? Math.max(2, Math.round(rate * BAR_MAX_HEIGHT)) : 2;
                return (
                  <View key={i} style={progressStyles.barCol}>
                    <View style={progressStyles.barTrack}>
                      <View
                        style={[
                          progressStyles.bar,
                          { height: barHeight },
                          !hasData && progressStyles.barMuted
                        ]}
                      />
                    </View>
                    <Text style={progressStyles.barLabel}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {categoryData.length > 0 && (
            <View style={progressStyles.card}>
              <Text style={progressStyles.sectionTitle}>Categories</Text>
              {categoryData.map((cat) => (
                <View key={cat.category} style={progressStyles.catRow}>
                  <Text style={progressStyles.catLabel}>
                    {CATEGORY_LABELS[cat.category] || cat.category}
                  </Text>
                  <View style={progressStyles.progressTrack}>
                    <View
                      style={[
                        progressStyles.progressFill,
                        { width: `${Math.round(Number(cat.adherence_rate) * 100)}%` }
                      ]}
                    />
                  </View>
                  <Text style={progressStyles.catPct}>
                    {Math.round(Number(cat.adherence_rate) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          )}

          {nudgeLoading && (
            <View style={progressStyles.nudgeCard}>
              <Text style={progressStyles.nudgeLabel}>✨ AI Coach</Text>
              <ActivityIndicator color="#15803d" />
            </View>
          )}
          {!nudgeLoading && nudge && (
            <View style={progressStyles.nudgeCard}>
              <Text style={progressStyles.nudgeLabel}>✨ AI Coach</Text>
              <Text style={progressStyles.nudgeText}>{nudge}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </ScreenLayout>
  );
}

function ProtocolsScreen() {
  const [protocols, setProtocols] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/protocols`)
      .then((res) => res.json())
      .then((json) => setProtocols(json.items || []))
      .catch(() => setProtocols([]));
  }, []);

  return (
    <ScreenLayout title="Protocols">
      <FlatList
        data={protocols}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text>No protocols found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardText}>{item.description}</Text>
            <Text style={styles.badge}>Evidence: {item.evidence_tier}</Text>
          </View>
        )}
      />
    </ScreenLayout>
  );
}

function ProfileScreen({ user, onLogout }) {
  return (
    <ScreenLayout title="Profile">
      <Text style={styles.cardText}>Signed in as: {user?.email || "Unknown user"}</Text>
      <View style={styles.generateButtonWrap}>
        <Button title="Log Out" onPress={onLogout} />
      </View>
      <Text style={styles.cardText}>Data privacy controls (placeholder)</Text>
    </ScreenLayout>
  );
}

function OnboardingScreen({ submitGoals }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleGoal(goalKey) {
    setSelected((current) =>
      current.includes(goalKey) ? current.filter((goal) => goal !== goalKey) : [...current, goalKey]
    );
  }

  async function complete() {
    if (!selected.length) {
      setError("Select at least one goal.");
      return;
    }
    setError("");
    setSaving(true);
    await submitGoals(selected);
    setSaving(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Choose your goals</Text>
      <Text style={styles.cardText}>We will auto-activate protocols based on these goals.</Text>
      {GOAL_OPTIONS.map((goal) => (
        <Pressable
          key={goal.key}
          style={[styles.goalPill, selected.includes(goal.key) ? styles.goalPillActive : null]}
          onPress={() => toggleGoal(goal.key)}
        >
          <Text style={selected.includes(goal.key) ? styles.goalTextActive : styles.goalText}>
            {goal.label}
          </Text>
        </Pressable>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saving ? <ActivityIndicator /> : <Button title="Finish onboarding" onPress={complete} />}
    </SafeAreaView>
  );
}

function ScreenLayout({ title, children }) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </SafeAreaView>
  );
}

export default function App() {
  const [token, setToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("demo1234");
  const [authError, setAuthError] = useState("");

  async function clearSession() {
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken })
        });
      } catch (_err) {
        // Ignore logout network failures and clear local session.
      }
    }
    setToken("");
    setRefreshToken("");
    setUser(null);
    setProfile(null);
  }

  async function fetchProfile(nextToken) {
    const response = await fetch(`${API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${nextToken}` }
    });
    if (!response.ok) {
      return;
    }
    const json = await response.json();
    setUser(json.user);
    setProfile(json.profile);
  }

  async function login() {
    try {
      setAuthError("");
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        throw new Error("Login failed");
      }
      const json = await response.json();
      setToken(json.token);
      setRefreshToken(json.refreshToken);
      setUser(json.user);
      await fetchProfile(json.token);
    } catch (_err) {
      setAuthError("Unable to log in. Confirm API is running and credentials are valid.");
    }
  }

  async function apiFetch(path, options = {}) {
    const request = async (accessToken) =>
      fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${accessToken}`
        }
      });

    let response = await request(token);
    if (response.status !== 401 || !refreshToken) {
      return response;
    }

    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });

    if (!refreshResponse.ok) {
      await clearSession();
      return response;
    }

    const refreshJson = await refreshResponse.json();
    setToken(refreshJson.token);
    setRefreshToken(refreshJson.refreshToken);
    await fetchProfile(refreshJson.token);
    response = await request(refreshJson.token);
    return response;
  }

  async function submitOnboardingGoals(goals) {
    const response = await apiFetch("/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goals,
        constraints: { work_hours: "9-6" },
        preferences: { reminder_windows: ["07:00-08:00", "20:00-21:00"] }
      })
    });
    if (response.ok) {
      await fetchProfile(token);
    }
  }

  if (DEMO_MODE) {
    return (
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen name="Today">{() => <TodayScreen apiFetch={demoApiFetch} />}</Tab.Screen>
          <Tab.Screen name="Progress">{() => <ProgressScreen apiFetch={demoApiFetch} />}</Tab.Screen>
          <Tab.Screen name="Protocols" component={ProtocolsScreen} />
          <Tab.Screen name="Profile">
            {() => <ProfileScreen user={{ email: "demo@example.com" }} onLogout={() => {}} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Text style={styles.title}>ProtocolPath</Text>
        <Text style={styles.cardText}>Sign in to access your personalized plan.</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholder="Password"
          secureTextEntry
        />
        {authError ? <Text style={styles.error}>{authError}</Text> : null}
        <Button title="Log In" onPress={login} />
      </SafeAreaView>
    );
  }

  const needsOnboarding = !profile || !Array.isArray(profile.goals) || profile.goals.length === 0;
  if (needsOnboarding) {
    return <OnboardingScreen submitGoals={submitOnboardingGoals} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Today">{() => <TodayScreen apiFetch={apiFetch} />}</Tab.Screen>
        <Tab.Screen name="Progress">{() => <ProgressScreen apiFetch={apiFetch} />}</Tab.Screen>
        <Tab.Screen name="Protocols" component={ProtocolsScreen} />
        <Tab.Screen name="Profile">
          {() => <ProfileScreen user={user} onLogout={clearSession} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingTop: 12
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4
  },
  cardText: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 4
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8
  },
  badge: {
    fontSize: 12,
    color: "#0f766e"
  },
  error: {
    color: "#dc2626",
    marginBottom: 8
  },
  input: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  generateButtonWrap: {
    marginBottom: 10
  },
  goalPill: {
    backgroundColor: "white",
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8
  },
  goalPillActive: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e"
  },
  goalText: {
    color: "#0f172a"
  },
  goalTextActive: {
    color: "white"
  }
});

const progressStyles = StyleSheet.create({
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155"
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 8
  },
  navBtnDisabled: {
    backgroundColor: "#f1f5f9"
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f766e"
  },
  navBtnTextDisabled: {
    color: "#94a3b8"
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    alignItems: "center"
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f766e"
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12
  },
  barChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 110,
    alignItems: "flex-end"
  },
  barCol: {
    flex: 1,
    alignItems: "center"
  },
  barTrack: {
    width: 24,
    height: 80,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  bar: {
    width: "100%",
    backgroundColor: "#0f766e",
    borderRadius: 4
  },
  barMuted: {
    backgroundColor: "#cbd5e1"
  },
  barLabel: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  catLabel: {
    width: 110,
    fontSize: 13,
    color: "#334155"
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0f766e",
    borderRadius: 4
  },
  catPct: {
    width: 38,
    textAlign: "right",
    fontSize: 13,
    color: "#64748b"
  },
  nudgeCard: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12
  },
  nudgeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
    marginBottom: 6
  },
  nudgeText: {
    fontSize: 14,
    color: "#166534",
    lineHeight: 20
  }
});
