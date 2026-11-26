import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { api } from "../api";
import { Header } from "../components/ui";
import { GREEN, DARK, SOFT, MUTED, LINE } from "../theme";

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Real mood + posture alerts for this parent's linked student, merged by
// the backend. Marking read updates the real row (alerts.read_at or
// posture_alerts.read_at) - nothing here is SMS/push, by design (see the
// panel's privacy feedback on phone-number-based alerts).
export default function Alerts({ parent }) {
  const [alerts, setAlerts] = useState(null);

  function load() {
    api.getAlerts(parent.id).then(setAlerts).catch(() => setAlerts([]));
  }

  useEffect(load, [parent.id]);

  async function markRead(alert) {
    await api.markAlertRead(alert.id, alert.type);
    setAlerts((prev) => prev.map((a) => (a.id === alert.id && a.type === alert.type ? { ...a, is_read: 1 } : a)));
  }

  const unread = (alerts || []).filter((a) => !a.is_read).length;

  return (
    <View style={{ flex: 1, padding: 18, paddingTop: 10 }}>
      <Header title="Parent alerts" sub="Private, in-app updates about your child's study and wellbeing." />

      <View style={s.summary}>
        <View>
          <Text style={s.sub}>UNREAD UPDATES</Text>
          <Text style={s.summaryNumber}>{unread}</Text>
        </View>
        <Text style={{ fontSize: 26 }}>🔔</Text>
      </View>

      {alerts === null ? (
        <Text style={s.sub}>Loading…</Text>
      ) : alerts.length === 0 ? (
        <Text style={s.sub}>No alerts yet. A sustained concerning mood, poor posture, or an early-stopped session will appear here.</Text>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(a) => `${a.type}-${a.id}`}
          renderItem={({ item }) => (
            <Pressable style={[s.row, item.is_read && s.rowRead]} onPress={() => !item.is_read && markRead(item)}>
              <Text style={{ fontSize: 18 }}>{item.type === "mood" ? "😟" : item.type === "posture" ? "🧍" : "⏹️"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>
                  {item.type === "mood"
                    ? `${item.mood[0].toUpperCase()}${item.mood.slice(1)} mood detected`
                    : item.type === "posture"
                    ? "Poor posture detected"
                    : `Stopped studying early${item.studied_min != null && item.duration_min ? ` (${item.studied_min} of ${item.duration_min} min)` : ""}`}
                  {item.subject ? ` · ${item.subject}` : ""}
                </Text>
                <Text style={s.sub}>{formatTime(item.sent_at)}</Text>
              </View>
              {!item.is_read && <View style={s.dot} />}
            </Pressable>
          )}
        />
      )}

      <View style={s.privacyNote}>
        <Text style={{ fontSize: 16 }}>🔒</Text>
        <Text style={s.sub}>Private in-app notifications only — no SMS or phone number is collected for alerts.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sub: { fontSize: 11, color: MUTED, lineHeight: 15 },
  summary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: SOFT, borderRadius: 16, padding: 16, marginBottom: 14 },
  summaryNumber: { fontSize: 28, fontWeight: "800", color: DARK, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: LINE, borderRadius: 14, padding: 13, marginBottom: 8 },
  rowRead: { opacity: 0.6 },
  title: { fontSize: 12, fontWeight: "800", color: DARK, marginBottom: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  privacyNote: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: SOFT, borderRadius: 14, padding: 13, marginTop: 10 },
});
