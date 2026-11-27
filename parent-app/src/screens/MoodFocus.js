import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { api } from "../api";
import { Card, SectionTitle, Stat, Header } from "../components/ui";
import { GREEN, DARK, MUTED, LINE, SOFT } from "../theme";

// Same 7 FER-2013 moods the CNN classifies, same emoji the student web app
// uses (see frontend/src/data/moods.js) - kept as a small local map here
// instead of importing across the two separate Expo/Vite projects.
const MOOD_EMOJI = {
  happy: "🙂",
  sad: "😔",
  angry: "😠",
  fear: "😨",
  disgust: "🤢",
  neutral: "😐",
  surprise: "😮",
};

// Caps how many real check-ins render at once - a real "+N more" count is
// shown instead of silently cutting the list off, same pattern used
// elsewhere on this project.
const MAX_SHOWN = 20;

function formatTimestamp(isoString) {
  const d = new Date(isoString);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${weekday} ${time}`;
}

function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

// Real mood history + real per-subject focus, read-only - the parent-side
// equivalent of the student's own Mood & Focus page, same backend data
// (nutrition-history for the check-ins, focus for the subject scores), just
// shown here without any editing controls.
export default function MoodFocus({ studentId }) {
  const [history, setHistory] = useState(null);
  const [subjects, setSubjects] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    api.getNutritionHistory(studentId, 200).then(setHistory).catch(() => setHistory([]));
    api.getFocus(studentId).then(setSubjects).catch(() => setSubjects([]));
  }, [studentId]);

  const latest = history && history.length > 0 ? history[0] : null;
  const topSubject = subjects && subjects.length > 0 ? [...subjects].sort((a, b) => b.score - a.score)[0] : null;
  const shownHistory = (history || []).slice(0, MAX_SHOWN);
  const remaining = (history || []).length - shownHistory.length;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
      <Header title="Mood & Focus" sub="The same real mood history and focus data the student sees." />

      <View style={s.statsRow}>
        <Stat
          style={s.statThird}
          emoji={latest ? MOOD_EMOJI[latest.mood] || "🙂" : "—"}
          label="Latest mood"
          value={latest ? cap(latest.mood) : "—"}
        />
        <Stat
          style={s.statThird}
          emoji="🎯"
          label="Best focus subject"
          value={topSubject ? topSubject.subject : "—"}
          sub={topSubject ? `${topSubject.score}% focus` : null}
        />
        <Stat style={s.statThird} emoji="📅" label="Check-ins recorded" value={String((history || []).length)} />
      </View>

      <Card>
        <SectionTitle title="Mood history" />
        {history === null ? (
          <Text style={s.sub}>Loading…</Text>
        ) : history.length === 0 ? (
          <Text style={s.sub}>No check-ins yet.</Text>
        ) : (
          <>
            {shownHistory.map((entry) => (
              <View key={entry.mood_id} style={s.historyRow}>
                <View style={s.historyHead}>
                  <Text style={s.historyMood}>
                    {cap(entry.mood)}
                    {entry.subject ? ` — ${entry.subject}` : ""}
                  </Text>
                  <Text style={s.historyTime}>{formatTimestamp(entry.detected_at)}</Text>
                </View>
                {entry.foods && entry.foods.length > 0 && (
                  <View style={s.chipsRow}>
                    {entry.foods.slice(0, 6).map((f) => (
                      <View key={f} style={s.chip}>
                        <Text style={s.chipText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
            {remaining > 0 && <Text style={[s.sub, { marginTop: 8 }]}>+{remaining} more check-ins</Text>}
          </>
        )}
      </Card>

      <Card>
        <SectionTitle title="Focus by subject" />
        {subjects === null ? (
          <Text style={s.sub}>Loading…</Text>
        ) : subjects.length === 0 ? (
          <Text style={s.sub}>No subject data yet — appears after a few study sessions.</Text>
        ) : (
          subjects.map((f) => (
            <View key={f.subject} style={s.subjectRow}>
              <View style={s.subjectHead}>
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
  content: { padding: 18, paddingTop: 10, paddingBottom: 30 },
  sub: { fontSize: 11, color: MUTED, lineHeight: 16 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statThird: { width: "31%" },
  historyRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: LINE },
  historyHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyMood: { fontSize: 12, fontWeight: "800", color: DARK },
  historyTime: { fontSize: 10, color: MUTED },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chip: { backgroundColor: SOFT, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 10, fontWeight: "700", color: GREEN },
  subjectRow: { marginBottom: 14 },
  subjectHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  subjectName: { fontSize: 12, fontWeight: "700", color: DARK },
  subjectScore: { fontSize: 12, fontWeight: "800", color: GREEN },
  track: { height: 7, borderRadius: 999, backgroundColor: "#EEF5F0", overflow: "hidden" },
  fill: { height: "100%", backgroundColor: GREEN, borderRadius: 999 },
});
