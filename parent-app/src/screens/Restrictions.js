import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { api } from "../api";
import { Header } from "../components/ui";
import { GREEN, DARK, SOFT, MUTED, LINE, RED } from "../theme";

// Real food list (all 93, from the same CSV the rule engine reads) + the
// real restriction list already saved for this student - no placeholder
// food names, no fabricated prices.
export default function Restrictions({ studentId }) {
  const [catalog, setCatalog] = useState(null);
  const [restricted, setRestricted] = useState(new Set());
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentId) return;
    Promise.all([api.getFoodCatalog(), api.getRestrictions(studentId)])
      .then(([foods, names]) => {
        setCatalog(foods);
        setRestricted(new Set(names));
      })
      .catch(() => setError("Could not reach the server."));
  }, [studentId]);

  async function toggle(foodName) {
    const next = new Set(restricted);
    if (next.has(foodName)) next.delete(foodName);
    else next.add(foodName);
    setRestricted(next); // optimistic - reflects immediately
    try {
      await api.setRestrictions(studentId, Array.from(next));
    } catch {
      setRestricted(restricted); // revert if the save failed
      setError("Could not save that change. Check your connection.");
    }
  }

  const visible = (catalog || []).filter((f) => {
    const q = search.toLowerCase();
    return (
      f.food_name.toLowerCase().includes(q) ||
      (f.tamil_name || "").includes(search) ||
      (f.sinhala_name || "").includes(search)
    );
  });

  return (
    <View style={{ flex: 1, padding: 18, paddingTop: 10 }}>
      <Header title="Food restrictions" sub="Review the full food list and mark anything your child must not eat." />

      <View style={s.banner}>
        <Text style={{ fontSize: 20 }}>🛡️</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.bannerTitle}>You're in control</Text>
          <Text style={s.sub}>Restricted foods are removed from the student's recommendations immediately.</Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={s.count}>{restricted.size}</Text>
          <Text style={s.sub}>Restricted</Text>
        </View>
      </View>

      <TextInput
        style={s.search}
        placeholder="Search foods in English, Tamil or Sinhala"
        value={search}
        onChangeText={setSearch}
      />
      {error ? <Text style={{ color: RED, fontSize: 11, marginBottom: 8 }}>{error}</Text> : null}

      {catalog === null ? (
        <Text style={s.sub}>Loading real food catalog…</Text>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(f) => f.food_name}
          renderItem={({ item }) => {
            const blocked = restricted.has(item.food_name);
            return (
              <View style={[s.row, blocked && s.rowBlocked]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.foodName}>{item.food_name}</Text>
                  <Text style={s.sub}>
                    {item.tamil_name} · {item.sinhala_name} · Rs. {item.price_lkr}
                  </Text>
                </View>
                <Pressable style={[s.toggleBtn, blocked && s.toggleBtnOn]} onPress={() => toggle(item.food_name)}>
                  <Text style={[s.toggleText, blocked && { color: "#fff" }]}>{blocked ? "Restricted" : "Allow"}</Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  sub: { fontSize: 11, color: MUTED, lineHeight: 15 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: SOFT, borderRadius: 16, padding: 14, marginBottom: 14 },
  bannerTitle: { fontSize: 12, fontWeight: "800", color: DARK, marginBottom: 2 },
  count: { fontSize: 20, fontWeight: "800", color: GREEN },
  search: { height: 44, borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 13, marginBottom: 12, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: LINE, borderRadius: 14, padding: 12, marginBottom: 8 },
  rowBlocked: { opacity: 0.75 },
  foodName: { fontSize: 12, fontWeight: "800", color: DARK },
  toggleBtn: { borderWidth: 1, borderColor: "#CDEBD8", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  toggleBtnOn: { backgroundColor: RED, borderColor: RED },
  toggleText: { fontSize: 10, fontWeight: "800", color: GREEN },
});
