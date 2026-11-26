import { View, Text, StyleSheet } from "react-native";
import { Card, SectionTitle, Header, Button } from "../components/ui";
import { DARK, MUTED, LINE } from "../theme";

export default function Settings({ parent, child, onLogout }) {
  return (
    <View style={{ flex: 1, padding: 18, paddingTop: 10 }}>
      <Header title="Settings" sub="Your parent account and linked student." />

      <Card>
        <SectionTitle title="Parent account" />
        <Text style={s.label}>Email</Text>
        <Text style={s.value}>{parent.email}</Text>
        <View style={s.divider} />
        <Text style={s.label}>Linked child</Text>
        <Text style={s.value}>{child?.name || "—"}</Text>
      </Card>

      <Card>
        <SectionTitle title="Privacy" />
        <Text style={s.sub}>
          This app only shows data for your linked student account. Alerts are delivered in-app only — no SMS or
          phone number is collected.
        </Text>
      </Card>

      <Button title="Sign out" outline onPress={onLogout} />
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 10, color: MUTED, fontWeight: "700", marginBottom: 4 },
  value: { fontSize: 13, fontWeight: "800", color: DARK },
  divider: { height: 1, backgroundColor: LINE, marginVertical: 13 },
  sub: { fontSize: 11, color: MUTED, lineHeight: 17 },
});
