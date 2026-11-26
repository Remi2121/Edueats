import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { api } from "../api";
import { Card, SectionTitle, Header } from "../components/ui";
import { GREEN, DARK, MINT, MUTED } from "../theme";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Real per-day minutes (from sessions.started_at/ended_at) and real
// per-subject focus scores (from the mood/session join) - same source the
// student web app's Progress page uses, just read-only here.
export default function Progress({ studentId }) {
  const [days, setDays] = useState(null);
  const [focus, setFocus] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    api.getWeekMinutes(studentId).then(setDays).catch(() => setDays([]));
    api.getFocus(studentId).then(setFocus).catch(() => setFocus([]));
  }, [studentId]);

  const totalMinutes = (days || []).reduce((a, d) => a + d.minutes, 0);
  const maxMinutes = Math.max(1, ...(days || []).map((d) => d.minutes));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingTop: 10, paddingBottom: 30 }}>
      <Header title="Child progress" sub="A real view of recent study habits and focus." />

      <Card>
        <SectionTitle title="Study time this week" />
        <Text style={s.bigNumber}>{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</Text>
        {days === null ? (
          <Text style={s.sub}>Loading…</Text>
        ) : (
          <View style={s.bars}>
            {Array.from({ length: 7 }, (_, i) => {
              const dayDate = new Date();
              dayDate.setDate(dayDate.getDate() - (6 - i));
              const match = days.find((d) => new Date(d.day).toDateString() === dayDate.toDateString());
              const minutes = match ? match.minutes : 0;
              return (
                <View key={i} style={s.barCol}>
                  <View style={[s.bar, { height: Math.max(4, (minutes / maxMinutes) * 90) }]} />
                  <Text style={s.barLabel}>{DAY_LABELS[dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1]}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <Card>
        <SectionTitle title="Focus by subject" />
        {focus === null ? (
          <Text style={s.sub}>Loading…</Text>
        ) : focus.length === 0 ? (
          <Text style={s.sub}>No subject data yet — appears after a few study sessions.</Text>
        ) : (
          focus.map((f) => (
            <View key={f.subject} style={s.subjectRow}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={s.subjectName}>{f.subject}</Text>
                <Text style={s.subjectScore}>{f.score}%</Text>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${f.score}%` }]} />
              </View>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  sub: { fontSize: 11, color: MUTED },
  bigNumber: { fontSize: 24, fontWeight: "800", color: GREEN, marginBottom: 14 },
  bars: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", height: 110 },
  barCol: { alignItems: "center", gap: 6 },
  bar: { width: 18, borderRadius: 7, backgroundColor: MINT },
  barLabel: { fontSize: 9, color: MUTED },
  subjectRow: { marginBottom: 14 },
  subjectName: { fontSize: 12, fontWeight: "700", color: DARK },
  subjectScore: { fontSize: 12, fontWeight: "800", color: GREEN },
  track: { height: 7, borderRadius: 999, backgroundColor: "#EEF5F0", overflow: "hidden" },
  fill: { height: "100%", backgroundColor: GREEN, borderRadius: 999 },
});
