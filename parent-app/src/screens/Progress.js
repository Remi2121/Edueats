import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { api } from "../api";
import { Card, SectionTitle, Header } from "../components/ui";
import { GREEN, DARK, MINT, MUTED } from "../theme";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Real per-day minutes (from sessions.started_at/ended_at) - same source the
// student web app's Progress page uses, just read-only here. Focus-by-
// subject used to be duplicated on this screen too; it now lives only on
// the Mood & Focus tab (see MoodFocus.js) to avoid showing the same panel
// twice, same reasoning as removing the duplicate panel on the student side.
export default function Progress({ studentId }) {
  const [days, setDays] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    api.getWeekMinutes(studentId).then(setDays).catch(() => setDays([]));
  }, [studentId]);

  const totalMinutes = (days || []).reduce((a, d) => a + d.minutes, 0);
  const maxMinutes = Math.max(1, ...(days || []).map((d) => d.minutes));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingTop: 10, paddingBottom: 30 }}>
      <Header title="Child progress" sub="A real view of recent study habits." />

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
});
