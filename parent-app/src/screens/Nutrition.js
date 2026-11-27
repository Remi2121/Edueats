import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Image, ScrollView, Pressable, Modal, StyleSheet } from "react-native";
import { api } from "../api";
import { foodImageUrl } from "../data/foodImages";
import { Card, SectionTitle, Header } from "../components/ui";
import { GREEN, DARK, SOFT, MUTED, LINE, SURFACE } from "../theme";

const CATEGORIES = ["All", "Fruit", "Vegetable", "Dairy", "Nuts", "Grain", "Protein", "Other"];
const CATEGORY_EMOJI = {
  Fruit: "🍎", Vegetable: "🥒", Dairy: "🥛", Nuts: "🥜", Grain: "🌾", Protein: "🥚", Other: "🍬",
};
const NUTRIENT_LABELS = {
  calories: ["Calories", "kcal"],
  fat_g: ["Fat", "g"],
  sugar_g: ["Sugar", "g"],
  water_ml: ["Water", "ml"],
  magnesium_mg: ["Magnesium", "mg"],
  vitamin_b_mg: ["Vitamin B", "mg"],
};

// Caps how many cards/rows render at once in any one list on this screen - a
// real count of the rest is shown instead of silently cutting the list off,
// same pattern used on the student app's own My Nutrition page.
const MAX_SHOWN = 20;
const MAX_FOODS_PER_ENTRY = 6;

function formatTimestamp(isoString) {
  const d = new Date(isoString);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${weekday} ${time}`;
}

function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

// Real per-session check-in history (month-by-month) + the real 93-food
// catalog, filtered by the parent's own restrictions - the read-only
// parent-side equivalent of the student's own My Nutrition page, same
// backend data, no editing controls.
export default function Nutrition({ studentId }) {
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [restrictedNames, setRestrictedNames] = useState([]);
  const [snacks, setSnacks] = useState([]);
  const [history, setHistory] = useState(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [popupFood, setPopupFood] = useState(null);
  const [popupNutrients, setPopupNutrients] = useState(null);
  const [popupError, setPopupError] = useState("");

  useEffect(() => {
    api.getFoodCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    if (!studentId) return;
    api.getNutritionHistory(studentId, 500).then(setHistory).catch(() => setHistory([]));
    api.getRestrictions(studentId).then(setRestrictedNames).catch(() => setRestrictedNames([]));
    api.getLatestNutrition(studentId).then(setSnacks).catch(() => setSnacks([]));
  }, [studentId]);

  async function openFoodPopup(food) {
    setPopupFood(food);
    setPopupNutrients(null);
    setPopupError("");
    try {
      const data = await api.getFoodNutrients(food);
      setPopupNutrients(data);
    } catch {
      setPopupError("No nutrient data found for this food.");
    }
  }

  const restrictedSet = useMemo(() => new Set(restrictedNames), [restrictedNames]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (catalog || []).filter((f) => {
      if (restrictedSet.has(f.food_name)) return false;
      if (category !== "All" && (f.category || "Other") !== category) return false;
      if (!q) return true;
      const haystack = `${f.food_name} ${f.tamil_name || ""} ${f.sinhala_name || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [catalog, query, category, restrictedSet]);

  const shownList = list.slice(0, MAX_SHOWN);
  const remainingCount = list.length - shownList.length;

  const selectedMonth = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);
  const monthLabel = selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const canGoNext = monthOffset < 0;

  const monthHistory = useMemo(() => {
    if (!history) return [];
    return history.filter((e) => {
      const d = new Date(e.detected_at);
      return d.getFullYear() === selectedMonth.getFullYear() && d.getMonth() === selectedMonth.getMonth();
    });
  }, [history, selectedMonth]);

  const mostSuggested = useMemo(() => {
    if (monthHistory.length === 0) return null;
    const counts = {};
    monthHistory.forEach((e) => (e.foods || []).forEach((f) => { counts[f] = (counts[f] || 0) + 1; }));
    const entries = Object.entries(counts);
    if (entries.length === 0) return null;
    const [food_name, count] = entries.sort((a, b) => b[1] - a[1])[0];
    return { food_name, count };
  }, [monthHistory]);

  const shownHistory = monthHistory.slice(0, MAX_SHOWN);
  const remainingHistoryCount = monthHistory.length - shownHistory.length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
        <Header title="My Nutrition" sub="The same real food history and catalog the student sees." />

        <Card>
          <View style={s.monthRow}>
            <SectionTitle title="Check-in history" />
            <View style={s.monthNav}>
              <Pressable onPress={() => setMonthOffset((m) => m - 1)} style={s.monthBtn}>
                <Text style={s.monthBtnText}>◀</Text>
              </Pressable>
              <Text style={s.monthLabel}>{monthLabel}</Text>
              <Pressable onPress={() => canGoNext && setMonthOffset((m) => m + 1)} style={s.monthBtn} disabled={!canGoNext}>
                <Text style={[s.monthBtnText, !canGoNext && { opacity: 0.3 }]}>▶</Text>
              </Pressable>
            </View>
          </View>

          {mostSuggested && (
            <Text style={s.mostUsed}>⭐ Most suggested: <Text style={{ fontWeight: "800" }}>{mostSuggested.food_name}</Text> ({mostSuggested.count}×)</Text>
          )}

          {history === null ? (
            <Text style={s.sub}>Loading…</Text>
          ) : monthHistory.length === 0 ? (
            <Text style={s.sub}>No check-ins in {monthLabel}.</Text>
          ) : (
            <>
              {shownHistory.map((entry) => (
                <View key={entry.mood_id} style={s.historyBox}>
                  <Text style={s.historyDate}>{formatTimestamp(entry.detected_at)}</Text>
                  <Text style={s.historyMood}>
                    {cap(entry.mood)}{entry.subject ? ` — ${entry.subject}` : ""}
                  </Text>
                  <View style={s.chipsRow}>
                    {entry.foods.slice(0, MAX_FOODS_PER_ENTRY).map((food) => (
                      <Pressable key={food} style={s.chip} onPress={() => openFoodPopup(food)}>
                        <Text style={s.chipText}>{food}</Text>
                      </Pressable>
                    ))}
                    {entry.foods.length > MAX_FOODS_PER_ENTRY && (
                      <Text style={s.chipMore}>+{entry.foods.length - MAX_FOODS_PER_ENTRY} more</Text>
                    )}
                  </View>
                </View>
              ))}
              {remainingHistoryCount > 0 && <Text style={[s.sub, { marginTop: 8 }]}>+{remainingHistoryCount} more check-ins</Text>}
            </>
          )}
        </Card>

        <Card>
          <SectionTitle title="Food catalog" action={`${snacks.length} recommended now`} />
          <View style={s.searchBox}>
            <Text style={{ marginRight: 6 }}>🔎</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search in English, தமிழ் or සිංහල"
              style={s.searchInput}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryRow}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[s.categoryTab, category === c && s.categoryTabActive]}
              >
                <Text style={[s.categoryTabText, category === c && s.categoryTabTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {catalog === null ? (
            <Text style={[s.sub, { marginTop: 10 }]}>Loading the real food catalog…</Text>
          ) : (
            <View style={s.foodGrid}>
              {shownList.map((f) => {
                const image = foodImageUrl(f.food_name);
                const recommended = snacks.includes(f.food_name);
                const cat = f.category || "Other";
                return (
                  <Pressable key={f.food_name} style={s.foodCard} onPress={() => openFoodPopup(f.food_name)}>
                    <View style={s.foodImageWrap}>
                      {image ? (
                        <Image source={{ uri: image }} style={s.foodImage} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 22 }}>{CATEGORY_EMOJI[cat] || "🍽️"}</Text>
                      )}
                    </View>
                    <Text style={s.foodCategory}>{cat}</Text>
                    <Text style={s.foodName} numberOfLines={1}>{f.food_name}</Text>
                    <Text style={s.foodTrans} numberOfLines={1}>{f.tamil_name} · {f.sinhala_name}</Text>
                    <Text style={s.foodPrice}>Rs. {f.price_lkr}</Text>
                    <Text style={[s.foodTag, recommended && s.foodTagRecommended]}>
                      ✓ {recommended ? "Recommended" : "Available"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {remainingCount > 0 && <Text style={[s.sub, { marginTop: 10 }]}>+{remainingCount} more foods match this filter</Text>}
          {catalog && catalog.length > 0 && list.length === 0 && (
            <Text style={[s.sub, { marginTop: 10 }]}>No foods found — try another search term or category.</Text>
          )}
          <Text style={s.footnote}>*Nutrient values are sourced from the real USDA dataset — not placeholders.</Text>
        </Card>
      </ScrollView>

      <Modal visible={!!popupFood} transparent animationType="fade" onRequestClose={() => setPopupFood(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setPopupFood(null)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            {popupFood && foodImageUrl(popupFood) && (
              <Image source={{ uri: foodImageUrl(popupFood) }} style={s.popupImage} resizeMode="cover" />
            )}
            <Text style={s.modalTitle}>{popupFood}</Text>
            {popupError ? <Text style={s.sub}>{popupError}</Text> : null}
            {popupNutrients && (
              <View style={{ marginTop: 10 }}>
                {Object.entries(NUTRIENT_LABELS).map(([key, [label, unit]]) => (
                  <View key={key} style={s.nutrientRow}>
                    <Text style={s.nutrientLabel}>{label}</Text>
                    <Text style={s.nutrientValue}>{popupNutrients[key]} {unit}</Text>
                  </View>
                ))}
              </View>
            )}
            <Pressable style={s.closeBtn} onPress={() => setPopupFood(null)}>
              <Text style={s.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 18, paddingTop: 10, paddingBottom: 30 },
  sub: { fontSize: 11, color: MUTED, lineHeight: 16 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthNav: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  monthBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: SOFT, alignItems: "center", justifyContent: "center" },
  monthBtnText: { color: GREEN, fontWeight: "800", fontSize: 11 },
  monthLabel: { fontSize: 11, fontWeight: "800", color: DARK },
  mostUsed: { fontSize: 11, color: DARK, marginBottom: 10 },
  historyBox: { backgroundColor: SOFT, borderRadius: 14, padding: 12, marginBottom: 10 },
  historyDate: { fontSize: 9, color: MUTED, fontWeight: "700", marginBottom: 4 },
  historyMood: { fontSize: 12, fontWeight: "800", color: DARK, marginBottom: 8 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  chip: { backgroundColor: SURFACE, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: LINE },
  chipText: { fontSize: 10, fontWeight: "700", color: GREEN },
  chipMore: { fontSize: 10, color: MUTED },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: SOFT, borderRadius: 12, paddingHorizontal: 12, height: 42, marginTop: 4 },
  searchInput: { flex: 1, fontSize: 12, color: DARK },
  categoryRow: { marginTop: 10, marginBottom: 4 },
  categoryTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: SOFT, marginRight: 8 },
  categoryTabActive: { backgroundColor: GREEN },
  categoryTabText: { fontSize: 11, fontWeight: "700", color: DARK },
  categoryTabTextActive: { color: "#fff" },
  foodGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 10 },
  foodCard: { width: "48%", backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: LINE, padding: 10, marginBottom: 10 },
  foodImageWrap: { width: "100%", height: 64, borderRadius: 10, backgroundColor: SOFT, alignItems: "center", justifyContent: "center", marginBottom: 8, overflow: "hidden" },
  foodImage: { width: "100%", height: "100%" },
  foodCategory: { fontSize: 9, color: MUTED, fontWeight: "700", marginBottom: 2 },
  foodName: { fontSize: 12, fontWeight: "800", color: DARK },
  foodTrans: { fontSize: 10, color: MUTED, marginTop: 2 },
  foodPrice: { fontSize: 11, fontWeight: "800", color: DARK, marginTop: 6 },
  foodTag: { fontSize: 9, color: MUTED, fontWeight: "700", marginTop: 6 },
  foodTagRecommended: { color: GREEN },
  footnote: { fontSize: 9, color: MUTED, marginTop: 12, lineHeight: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(18,57,43,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 18, padding: 20, width: "100%", maxWidth: 360 },
  popupImage: { width: 84, height: 84, borderRadius: 14, alignSelf: "center", marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: DARK, textAlign: "center" },
  nutrientRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: LINE },
  nutrientLabel: { fontSize: 11, color: MUTED, fontWeight: "700" },
  nutrientValue: { fontSize: 11, color: DARK, fontWeight: "800" },
  closeBtn: { marginTop: 16, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: SOFT },
  closeBtnText: { color: GREEN, fontWeight: "800", fontSize: 12 },
});
