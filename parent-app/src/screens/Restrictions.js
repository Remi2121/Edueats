import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { api } from "../api";
import { Header } from "../components/ui";
import { GREEN, DARK, SOFT, MUTED, LINE, RED } from "../theme";

// Real food list (all 93, from the same CSV the rule engine reads) + the
// real restriction list already saved for this student - no placeholder
// food names, no fabricated prices.
//
// Nothing is suggested until the parent actually types something - typing
// shows real matching foods live, right below the search box, rather than
// a permanent always-visible list of all 93.
const MAX_SUGGESTIONS = 8;

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

  async function save(next) {
    setRestricted(next); // optimistic - reflects immediately
    try {
      await api.setRestrictions(studentId, Array.from(next));
    } catch {
      setError("Could not save that change. Check your connection.");
    }
  }

  function addRestriction(foodName) {
    const next = new Set(restricted);
    next.add(foodName);
    setSearch("");
    save(next);
  }

  function removeRestriction(foodName) {
    const next = new Set(restricted);
    next.delete(foodName);
    save(next);
  }

  const q = search.trim().toLowerCase();
  const matching = q
    ? (catalog || []).filter((f) =>
        !restricted.has(f.food_name) &&
        (f.food_name.toLowerCase().includes(q) || (f.tamil_name || "").includes(search) || (f.sinhala_name || "").includes(search))
      )
    : [];
  const suggestions = matching.slice(0, MAX_SUGGESTIONS);
  const remainingSuggestions = matching.length - suggestions.length;

  const restrictedFoods = (catalog || []).filter((f) => restricted.has(f.food_name));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingTop: 10, paddingBottom: 30 }}>
      <Header title="Food restrictions" sub="Search a food to stop it from being recommended to your child." />

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
        placeholder="Search a food to restrict…"
        value={search}
        onChangeText={setSearch}
      />
      {error ? <Text style={{ color: RED, fontSize: 11, marginBottom: 8 }}>{error}</Text> : null}

      {q.length > 0 && (
        <>
          <Text style={s.sectionLabel}>SUGGESTIONS</Text>
          <View style={s.resultsBox}>
            {catalog === null ? (
              <Text style={[s.sub, { padding: 12 }]}>Loading real food catalog…</Text>
            ) : suggestions.length === 0 ? (
              <Text style={[s.sub, { padding: 12 }]}>No matching food (or it's already restricted).</Text>
            ) : (
              suggestions.map((item) => (
                <Pressable key={item.food_name} style={s.resultRow} onPress={() => addRestriction(item.food_name)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.foodName}>{item.food_name}</Text>
                    <Text style={s.sub}>{item.tamil_name} · {item.sinhala_name} · Rs. {item.price_lkr}</Text>
                  </View>
                  <Text style={s.addText}>+ Restrict</Text>
                </Pressable>
              ))
            )}
          </View>
          {remainingSuggestions > 0 && (
            <Text style={[s.sub, { marginBottom: 14 }]}>+{remainingSuggestions} more — keep typing to narrow it down.</Text>
          )}
        </>
      )}

      <Text style={s.sectionLabel}>RESTRICTED FOODS</Text>
      {restrictedFoods.length === 0 ? (
        <Text style={s.sub}>No foods restricted yet — tap a food above to add it.</Text>
      ) : (
        restrictedFoods.map((item) => (
          <View key={item.food_name} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.foodName}>{item.food_name}</Text>
              <Text style={s.sub}>{item.tamil_name} · {item.sinhala_name} · Rs. {item.price_lkr}</Text>
            </View>
            <Pressable style={s.allowBtn} onPress={() => removeRestriction(item.food_name)}>
              <Text style={s.allowText}>Allow</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  sub: { fontSize: 11, color: MUTED, lineHeight: 15 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: SOFT, borderRadius: 16, padding: 14, marginBottom: 14 },
  bannerTitle: { fontSize: 12, fontWeight: "800", color: DARK, marginBottom: 2 },
  count: { fontSize: 20, fontWeight: "800", color: GREEN },
  search: { height: 44, borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 13, marginBottom: 10, fontSize: 12, backgroundColor: "#fff" },
  sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, color: MUTED, marginBottom: 8 },
  resultsBox: { backgroundColor: "#fff", borderWidth: 1, borderColor: LINE, borderRadius: 14, marginBottom: 6, overflow: "hidden" },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: LINE },
  addText: { fontSize: 10, fontWeight: "800", color: GREEN },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: LINE, borderRadius: 14, padding: 12, marginBottom: 8 },
  foodName: { fontSize: 12, fontWeight: "800", color: DARK },
  allowBtn: { borderWidth: 1, borderColor: "#CDEBD8", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  allowText: { fontSize: 10, fontWeight: "800", color: GREEN },
});
