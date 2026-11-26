import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { api } from "../api";
import { Card, SectionTitle, Stat, Header } from "../components/ui";
import { GREEN, DARK, SOFT, MUTED, LINE } from "../theme";

// Everything here is a real fetch from the backend - no seeded/demo
// numbers. A brand-new linked student with no check-ins yet will show
// "No check-ins yet" rather than an invented mood/food.
//
// `child` and the real alert list are both re-fetched on a real interval
// (not just once on mount), so the "currently studying" banner and a real
// new-alert toast both reflect what's actually happening on the student's
// device without needing push/socket infra - the same polling-based
// "real-time enough" pattern already used elsewhere on this project.
const LIVE_POLL_MS = 5000;

export default function Dashboard({ parent, child: initialChild, go, refreshChild }) {
  const [child, setChild] = useState(initialChild);
  const [mood, setMood] = useState(null);
  const [foods, setFoods] = useState([]);
  const [focusAvg, setFocusAvg] = useState(null);
  const [weekMinutes, setWeekMinutes] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [restrictedCount, setRestrictedCount] = useState(0);
  const [toast, setToast] = useState(null);
  const seenAlertIds = useRef(null); // null until the first real fetch resolves

  useEffect(() => {
    setChild(initialChild);
  }, [initialChild]);

  function pollAlerts() {
    if (!parent?.id) return;
    api.getAlerts(parent.id).then((rows) => {
      if (seenAlertIds.current) {
        const freshUnread = rows.find((a) => !a.is_read && !seenAlertIds.current.has(`${a.type}-${a.id}`));
        if (freshUnread) {
          setToast(
            freshUnread.type === "session"
              ? `Stopped studying early${freshUnread.subject ? ` — ${freshUnread.subject}` : ""}`
              : freshUnread.type === "mood"
              ? `${freshUnread.mood[0].toUpperCase()}${freshUnread.mood.slice(1)} mood detected`
              : "Poor posture detected"
          );
        }
      }
      seenAlertIds.current = new Set(rows.map((a) => `${a.type}-${a.id}`));
      setAlerts(rows);
    }).catch(() => {});
  }

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    pollAlerts();
    if (!refreshChild) return;
    const id = setInterval(() => {
      refreshChild().then((fresh) => fresh && setChild(fresh)).catch(() => {});
      pollAlerts();
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [refreshChild, parent?.id]);

  useEffect(() => {
    if (!child?.id) return;
    api.getLatestMood(child.id).then((rows) => setMood(rows[0] || null)).catch(() => {});
    api.getLatestNutrition(child.id).then(setFoods).catch(() => {});
    api.getFocus(child.id).then((rows) => {
      if (!rows.length) return setFocusAvg(null);
      setFocusAvg(Math.round(rows.reduce((a, r) => a + r.score, 0) / rows.length));
    }).catch(() => {});
    api.getWeekMinutes(child.id).then((rows) => setWeekMinutes(rows.reduce((a, r) => a + r.minutes, 0))).catch(() => {});
    api.getRestrictions(child.id).then((names) => setRestrictedCount(names.length)).catch(() => {});
  }, [child?.id]);

  const unreadAlerts = alerts.filter((a) => !a.is_read).length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.content}>
        <Header title="Good day 👋" sub={`Here's ${child?.name || "your child"}'s latest wellbeing overview.`} />

        <View style={[s.liveBanner, child?.studying_now ? s.liveBannerOn : s.liveBannerOff]}>
          <View style={[s.liveDot, child?.studying_now && s.liveDotOn]} />
          <Text style={s.liveText}>
            {child?.studying_now
              ? `Currently studying${child.live_subject ? ` — ${child.live_subject}` : ""}`
              : "Not currently studying"}
          </Text>
        </View>

        <View style={s.childBanner}>
          <View style={s.childAvatar}>
            <Text style={s.avatarText}>{(child?.name || "?").slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.childName}>{child?.name || "Loading…"}</Text>
            <Text style={s.sub}>{child?.grade ? `${child.grade} · Room ${child.room_no || "—"}` : "Linked student account"}</Text>
          </View>
        </View>

        <View style={s.statsGrid}>
          <Stat emoji="⏱️" label="Study this week" value={`${Math.floor(weekMinutes / 60)}h ${weekMinutes % 60}m`} />
          <Stat emoji={mood?.mood ? "🙂" : "—"} label="Latest mood" value={mood?.mood ? mood.mood[0].toUpperCase() + mood.mood.slice(1) : "No check-ins yet"} />
          <Stat emoji="🎯" label="Average focus" value={focusAvg != null ? `${focusAvg}%` : "—"} />
          <Stat emoji="🔔" label="Unread alerts" value={String(unreadAlerts)} />
        </View>

        <Card>
          <SectionTitle title="Latest wellbeing snapshot" action="Manage foods" onPress={() => go("restrictions")} />
          {foods.length ? (
            <View style={s.foodChipRow}>
              {foods.slice(0, 6).map((f) => (
                <View key={f} style={s.foodChip}>
                  <Text style={s.foodChipText}>{f}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.sub}>No food recommendation yet — appears after the student's first check-in.</Text>
          )}
        </Card>

        <Card>
          <SectionTitle title="Food restrictions" action="Manage" onPress={() => go("restrictions")} />
          <Pressable style={s.restrictRow} onPress={() => go("restrictions")}>
            <Text style={s.foodName}>{restrictedCount} food{restrictedCount === 1 ? "" : "s"} currently restricted</Text>
            <Text style={{ color: GREEN, fontWeight: "800" }}>→</Text>
          </Pressable>
        </Card>

        <Card>
          <SectionTitle title="Recent alerts" action="See all" onPress={() => go("alerts")} />
          <Text style={s.sub}>{unreadAlerts > 0 ? `${unreadAlerts} unread update${unreadAlerts === 1 ? "" : "s"} waiting.` : "You're all caught up."}</Text>
        </Card>
      </ScrollView>

      {toast && (
        <Pressable style={s.toast} onPress={() => { setToast(null); go("alerts"); }}>
          <Text style={{ fontSize: 15 }}>🔔</Text>
          <Text style={s.toastText} numberOfLines={2}>{toast}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 18, paddingTop: 10, paddingBottom: 30 },
  sub: { fontSize: 11, color: MUTED, lineHeight: 16 },
  liveBanner: { flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1 },
  liveBannerOn: { backgroundColor: "#E6F8EF", borderColor: "#BBF0D2" },
  liveBannerOff: { backgroundColor: "#F3F5F4", borderColor: LINE },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: MUTED },
  liveDotOn: { backgroundColor: GREEN },
  liveText: { fontSize: 12, fontWeight: "800", color: DARK },
  childBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SOFT, borderRadius: 17, padding: 14, marginBottom: 16 },
  childAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "800", color: GREEN, fontSize: 13 },
  childName: { fontSize: 13, fontWeight: "800", color: DARK },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  foodChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  foodChip: { backgroundColor: SOFT, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  foodChipText: { fontSize: 11, fontWeight: "700", color: GREEN },
  foodName: { fontSize: 12, fontWeight: "700", color: DARK },
  restrictRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10 },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: DARK,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  toastText: { flex: 1, color: "#fff", fontSize: 12, fontWeight: "700" },
});
