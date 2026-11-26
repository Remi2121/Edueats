import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { api } from "../api";
import { Card, SectionTitle, Stat, Header } from "../components/ui";
import { GREEN, DARK, SOFT, MUTED, LINE } from "../theme";

// Everything here is a real fetch from the backend - no seeded/demo
// numbers. A brand-new linked student with no check-ins yet will show
// "No check-ins yet" rather than an invented mood/food.
export default function Dashboard({ parent, child, go }) {
  const [mood, setMood] = useState(null);
  const [foods, setFoods] = useState([]);
  const [focusAvg, setFocusAvg] = useState(null);
  const [weekMinutes, setWeekMinutes] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [restrictedCount, setRestrictedCount] = useState(0);

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

  useEffect(() => {
    if (!parent?.id) return;
    api.getAlerts(parent.id).then((rows) => setUnreadAlerts(rows.filter((a) => !a.is_read).length)).catch(() => {});
  }, [parent?.id]);

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Header title="Good day 👋" sub={`Here's ${child?.name || "your child"}'s latest wellbeing overview.`} />

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
          <Text style={s.foodList}>{foods.slice(0, 5).join(" · ")}</Text>
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
  );
}

const s = StyleSheet.create({
  content: { padding: 18, paddingTop: 10, paddingBottom: 30 },
  sub: { fontSize: 11, color: MUTED, lineHeight: 16 },
  childBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SOFT, borderRadius: 17, padding: 14, marginBottom: 16 },
  childAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "800", color: GREEN, fontSize: 13 },
  childName: { fontSize: 13, fontWeight: "800", color: DARK },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  foodList: { fontSize: 12, fontWeight: "700", color: DARK, lineHeight: 18 },
  foodName: { fontSize: 12, fontWeight: "700", color: DARK },
  restrictRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10 },
});
