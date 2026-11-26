import { View, Text, Pressable, StyleSheet } from "react-native";
import { GREEN, DARK, SURFACE, LINE, MUTED, SOFT } from "../theme";

export function Button({ title, onPress, outline = false, danger = false, disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        s.button,
        outline && s.buttonOutline,
        danger && s.buttonDanger,
        disabled && s.buttonDisabled,
      ]}
    >
      <Text style={[s.buttonText, outline && s.buttonTextOutline, danger && s.buttonTextDanger]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onPress }) {
  return (
    <View style={s.sectionTitle}>
      <Text style={s.sectionHeading}>{title}</Text>
      {action ? (
        <Pressable onPress={onPress}>
          <Text style={s.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Stat({ label, value, emoji }) {
  return (
    <View style={s.stat}>
      <Text style={s.statEmoji}>{emoji}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

export function Header({ title, sub }) {
  return (
    <View style={s.header}>
      <Text style={s.eyebrow}>EDUEATS PARENT SPACE</Text>
      <Text style={s.headerTitle}>{title}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  button: {
    height: 48,
    backgroundColor: GREEN,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOutline: { backgroundColor: SOFT, borderWidth: 1, borderColor: "#CDEBD8" },
  buttonDanger: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#F3C9C9" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  buttonTextOutline: { color: GREEN },
  buttonTextDanger: { color: "#DC2626" },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: LINE,
  },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionHeading: { fontSize: 14, fontWeight: "800", color: DARK },
  action: { fontSize: 11, color: GREEN, fontWeight: "800" },
  stat: { width: "48%", backgroundColor: SURFACE, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: LINE, marginBottom: 10 },
  statEmoji: { fontSize: 20, marginBottom: 6 },
  statLabel: { fontSize: 10, color: MUTED },
  statValue: { fontSize: 18, fontWeight: "800", color: DARK, marginTop: 3 },
  header: { marginBottom: 16 },
  eyebrow: { fontSize: 9, letterSpacing: 1.2, color: GREEN, fontWeight: "800" },
  headerTitle: { fontSize: 21, fontWeight: "800", color: DARK, marginTop: 4 },
  sub: { fontSize: 11, color: MUTED, marginTop: 4 },
});
