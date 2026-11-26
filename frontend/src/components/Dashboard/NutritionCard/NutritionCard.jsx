import { useEffect, useMemo, useState } from "react";
import { formatHistoryTimestamp } from "../../../data/moods";
import { getFoodTranslations, getFoodCategory, getFullCatalog, loadFoodCatalog } from "../../../data/foodMetadata";
import { foodImageUrl } from "../../../data/foodImages";
import CardHead from "../shared/CardHead";
import "./NutritionCard.css";
import "../../AuthFlow.css"; // reuses the .popup-overlay/.popup-card styles already defined there

const API_BASE = "http://localhost:3000";

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

// Caps how many cards/rows render at once in any one list on this page — a
// real count of the rest is shown instead of silently cutting the list off.
const MAX_SHOWN = 20;
const MAX_FOODS_PER_ENTRY = 6;

export default function NutritionCard({ hidden, focused, snacks, studentId, lang = "en" }) {
  const [catalog, setCatalog] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [restrictedNames, setRestrictedNames] = useState([]);

  // Real per-session check-in history (when it happened, the mood, and the
  // real foods the rule engine matched that time) — not a manually-picked
  // log, since the student asked for this to reflect what actually happened
  // during real study sessions, not a free pick-any-food list.
  const [history, setHistory] = useState(null);
  // 0 = this month, -1 = one month back, etc. — the history list always
  // shows one real calendar month at a time, navigated like a calendar.
  const [monthOffset, setMonthOffset] = useState(0);
  const [popupFood, setPopupFood] = useState(null);
  const [popupNutrients, setPopupNutrients] = useState(null);
  const [popupError, setPopupError] = useState("");

  // The real 93-food catalog (nutrients + tamil_name/sinhala_name/price_lkr
  // + category), fetched once from the backend instead of per-food.
  useEffect(() => {
    loadFoodCatalog().then(() => setCatalog(getFullCatalog()));
  }, []);

  // Loads this student's real check-in history + the parent's real
  // restriction list once, so the catalog only ever shows foods the parent
  // has actually approved — the same real restriction table /api/checkin
  // already filters recommendations against.
  useEffect(() => {
    if (!studentId) return;
    fetch(`${API_BASE}/api/students/${studentId}/nutrition-history?limit=500`)
      .then((res) => res.json())
      .then(setHistory)
      .catch(() => setHistory([]));
    fetch(`${API_BASE}/api/students/${studentId}/restrictions`)
      .then((res) => res.json())
      .then(setRestrictedNames)
      .catch(() => setRestrictedNames([]));
  }, [studentId]);

  async function openFoodPopup(food) {
    setPopupFood(food);
    setPopupNutrients(null);
    setPopupError("");
    try {
      const res = await fetch(`${API_BASE}/api/foods/${encodeURIComponent(food)}`);
      if (!res.ok) {
        setPopupError("No nutrient data found for this food.");
        return;
      }
      setPopupNutrients(await res.json());
    } catch {
      setPopupError("Could not reach the server.");
    }
  }

  const restrictedSet = useMemo(() => new Set(restrictedNames), [restrictedNames]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((f) => {
      if (restrictedSet.has(f.food_name)) return false;
      if (category !== "All" && getFoodCategory(f.food_name) !== category) return false;
      if (!q) return true;
      const trans = getFoodTranslations(f.food_name);
      return `${trans.en} ${trans.ta} ${trans.si}`.toLowerCase().includes(q);
    });
  }, [catalog, query, category, restrictedSet]);

  const shownList = list.slice(0, MAX_SHOWN);
  const remainingCount = list.length - shownList.length;

  // The one real calendar month currently selected — only check-ins that
  // actually happened within it are shown, like flipping a calendar page.
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

  // The real food the rule engine has suggested most often during the
  // selected month — a genuine count, not a guess.
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
    <>
    <div className={"dash-card" + (hidden ? " hide" : "") + (focused ? " focused" : "")}>
      <div className="food-log-panel food-log-panel-first">
        <CardHead
          icon="📜"
          title="Your food history"
          sub="Real foods matched during each study session"
          action={
            <div className="month-nav">
              <button type="button" onClick={() => setMonthOffset((m) => m - 1)} aria-label="Previous month">◀</button>
              <span>{monthLabel}</span>
              <button type="button" onClick={() => setMonthOffset((m) => m + 1)} disabled={!canGoNext} aria-label="Next month">▶</button>
            </div>
          }
        />

        {mostSuggested && (
          <p className="food-log-most-used">
            ⭐ Most suggested: <b>{mostSuggested.food_name}</b> ({mostSuggested.count}×)
          </p>
        )}

        {history === null && <p className="food-log-empty">Loading…</p>}
        {history && monthHistory.length === 0 && (
          <p className="food-log-empty">No check-ins in {monthLabel}.</p>
        )}
        {history && monthHistory.length > 0 && (
          <div className="food-log-grid">
            {shownHistory.map((entry) => {
              const moodLabel = entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1);
              const foods = entry.foods.slice(0, MAX_FOODS_PER_ENTRY);
              return (
                <div key={entry.mood_id} className="food-log-box food-log-session-box">
                  <span className="food-log-box-date">{formatHistoryTimestamp(entry.detected_at)}</span>
                  <b>{moodLabel}{entry.subject ? ` — ${entry.subject}` : ""}</b>
                  <div className="food-log-session-foods">
                    {foods.map((food) => (
                      <button key={food} type="button" className="food-log-food-chip" onClick={() => openFoodPopup(food)}>
                        {food}
                      </button>
                    ))}
                    {entry.foods.length > MAX_FOODS_PER_ENTRY && (
                      <span className="food-log-session-more">+{entry.foods.length - MAX_FOODS_PER_ENTRY} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {remainingHistoryCount > 0 && (
          <p className="footnote" style={{ marginTop: 10 }}>+{remainingHistoryCount} more check-ins</p>
        )}
      </div>

      <div className="nutrition-feature">
        <span className="feature-icon" aria-hidden="true">🥗</span>
        <div>
          <b>Food suggestions for your wellbeing</b>
          <p>Suggestions are matched to your latest mood and filtered by your parent's food restrictions.</p>
        </div>
        <span className="soft-count">{snacks.length} recommended now</span>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <span aria-hidden="true">🔎</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in English, தமிழ் or සිංහල"
          />
        </div>
        <div className="category-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={category === c ? "selected" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {catalog.length === 0 ? (
        <p className="section-label" style={{ marginTop: 14 }}>Loading the real food catalog…</p>
      ) : (
        <div className="food-grid">
          {shownList.map((f) => {
            const trans = getFoodTranslations(f.food_name);
            const cat = getFoodCategory(f.food_name);
            const image = foodImageUrl(f.food_name);
            const recommended = snacks.includes(f.food_name);
            return (
              <div className="food-card" key={f.food_name}>
                <div className="food-card-top">
                  <div className="food-emoji">
                    {image ? <img src={image} alt="" loading="lazy" /> : <span aria-hidden="true">{CATEGORY_EMOJI[cat]}</span>}
                  </div>
                  <span className="food-category">{cat}</span>
                </div>
                <h3>{f.food_name}</h3>
                <div className="food-translations"><span>{trans.ta}</span><span>{trans.si}</span></div>
                <div className="food-nutrients">
                  <div><b>{Math.round(f.calories)}</b><small>kcal</small></div>
                  <div><b>{Math.round(f.water_ml)}%</b><small>water</small></div>
                  <div><b>{f.fat_g}g</b><small>fat</small></div>
                </div>
                <div className="food-card-bottom">
                  <div><b>Rs. {f.price_lkr}</b><small>Estimated serving price*</small></div>
                  <span className={"available-tag" + (recommended ? " recommended-tag" : "")}>
                    ✓ {recommended ? "Recommended" : "Available"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {remainingCount > 0 && (
        <p className="footnote" style={{ marginTop: 10 }}>+{remainingCount} more foods match this filter</p>
      )}
      {catalog.length > 0 && list.length === 0 && (
        <div className="empty-state">
          <span aria-hidden="true">🔎</span>
          <b>No foods found</b>
          <p>Try another search term or category.</p>
        </div>
      )}
      <p className="footnote">
        *Serving prices and nutrient values are sourced from the real USDA dataset — not placeholders.
      </p>
    </div>

    {popupFood && (
      <div className="popup-overlay" onClick={() => setPopupFood(null)}>
        <div className="popup-card" onClick={(e) => e.stopPropagation()}>
          {foodImageUrl(popupFood) && (
            <img className="popup-food-image" src={foodImageUrl(popupFood)} alt="" />
          )}
          <h3 className="heading-font">{popupFood}</h3>
          {popupError && <p>{popupError}</p>}
          {popupNutrients && (
            <div className="nutrient-rows">
              {Object.entries(NUTRIENT_LABELS).map(([key, [label, unit]]) => (
                <div key={key} className="nutrient-row">
                  <span>{label}</span>
                  <span className="mono">{popupNutrients[key]} {unit}</span>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-ghost" type="button" onClick={() => setPopupFood(null)}>Close</button>
        </div>
      </div>
    )}
    </>
  );
}
