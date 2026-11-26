import { useEffect, useState } from "react";
import { SafeAreaView, View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./src/api";
import Login from "./src/screens/Login";
import Dashboard from "./src/screens/Dashboard";
import Restrictions from "./src/screens/Restrictions";
import Alerts from "./src/screens/Alerts";
import Progress from "./src/screens/Progress";
import Settings from "./src/screens/Settings";
import { GREEN, BG, MUTED, LINE } from "./src/theme";

const SESSION_KEY = "edueats_parent_session";

const TABS = [
  { id: "dashboard", label: "Home", icon: "🏠" },
  { id: "restrictions", label: "Foods", icon: "🍎" },
  { id: "alerts", label: "Alerts", icon: "🔔" },
  { id: "progress", label: "Progress", icon: "📈" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function App() {
  const [parent, setParent] = useState(null);
  const [child, setChild] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [checkingSession, setCheckingSession] = useState(true);

  // Restores a real logged-in parent session on app restart (same
  // "sign-in should stick" preference as the student web app), instead of
  // asking to sign in again every time the app opens.
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => {
        if (raw) setParent(JSON.parse(raw));
      })
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!parent?.student_id) {
      setChild(null);
      return;
    }
    api.getChild(parent.id).then(setChild).catch(() => {});
  }, [parent]);

  // Re-fetches the real child record (including live study-session status)
  // on demand — Dashboard polls this so a session starting/stopping on the
  // student's device shows up here without needing push/socket infra.
  function refreshChild() {
    if (!parent?.id) return Promise.resolve(null);
    return api.getChild(parent.id).then((fresh) => {
      setChild(fresh);
      return fresh;
    });
  }

  function handleLoggedIn(parentData) {
    setParent(parentData);
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(parentData));
  }

  function handleLogout() {
    setParent(null);
    setChild(null);
    setPage("dashboard");
    AsyncStorage.removeItem(SESSION_KEY);
  }

  if (checkingSession) return null;

  // On a real phone this is just flex:1 — a normal full-screen mobile app.
  // On a desktop browser it reads as a real website instead: a full-height
  // page with a centered, readable content column (not a tiny phone-shaped
  // card floating in empty space, and not raw mobile-width text stretched
  // across the whole monitor either).
  if (!parent) {
    return (
      <View style={s.webBackdrop}>
        <SafeAreaView style={s.app}>
          <Login onLoggedIn={handleLoggedIn} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={s.webBackdrop}>
      <SafeAreaView style={s.app}>
        <StatusBar style="dark" />
        <View style={s.screenArea}>
          {page === "dashboard" && <Dashboard parent={parent} child={child} go={setPage} refreshChild={refreshChild} />}
          {page === "restrictions" && <Restrictions studentId={parent.student_id} />}
          {page === "alerts" && <Alerts parent={parent} />}
          {page === "progress" && <Progress studentId={parent.student_id} />}
          {page === "settings" && <Settings parent={parent} child={child} onLogout={handleLogout} />}
        </View>
        <View style={s.tabbar}>
          {TABS.map((tab) => (
            <Pressable key={tab.id} onPress={() => setPage(tab.id)} style={s.tab}>
              <Text style={{ fontSize: 18, opacity: page === tab.id ? 1 : 0.5 }}>{tab.icon}</Text>
              <Text style={[s.tabText, page === tab.id && s.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  // Full-height page background on web (same color as the app itself, so
  // there's no separate "boxed demo" look) — collapses to plain flex:1 on
  // native, where there's no browser viewport to fill differently.
  webBackdrop: Platform.OS === "web"
    ? { flex: 1, minHeight: "100vh", backgroundColor: BG }
    : { flex: 1 },
  // Fills the real laptop/desktop browser window edge to edge - a real
  // website, not a narrow column floating in the middle of the screen. On
  // native this is just flex:1, filling the real device screen the same way.
  app: Platform.OS === "web"
    ? { flex: 1, width: "100%", minHeight: "100vh", backgroundColor: BG }
    : { flex: 1, backgroundColor: BG },
  // The scrollable screen content sits between the (fixed) status bar area
  // and the (fixed) tab bar below — it never pushes the tab bar off-screen,
  // on either web or native.
  screenArea: { flex: 1, minHeight: 0 },
  tabbar: {
    height: 66,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: LINE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: Platform.OS === "ios" ? 6 : 2,
    flexShrink: 0,
  },
  tab: { alignItems: "center", gap: 3, flex: 1 },
  tabText: { fontSize: 9, color: MUTED, fontWeight: "600" },
  tabTextActive: { color: GREEN, fontWeight: "800" },
});
