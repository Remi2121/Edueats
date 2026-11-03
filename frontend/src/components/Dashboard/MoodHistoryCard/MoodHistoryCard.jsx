import { useEffect, useState } from "react";
import { formatHistoryTimestamp } from "../../../data/moods";
import { foodImageUrl } from "../../../data/foodImages";
import "./MoodHistoryCard.css";

const API_BASE = "http://localhost:3000";
const MAX_FOODS_PER_ENTRY = 6;

const NUTRIENT_LABELS = {
  calories: "Calories",
  fat_g: "Fat",
  sugar_g: "Sugar",
  water_ml: "Water",
  magnesium_mg: "Magnesium",
  vitamin_b_mg: "Vitamin B",
};

// Local calendar date (YYYY-MM-DD) for a real timestamp, matching what
// <input type="date"> itself works in — using the LOCAL date, not UTC.
function localDateOf(isoString) {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minutesOfDay(isoString) {
  const d = new Date(isoString);
  return d.getHours() * 60 + d.getMinutes();
}

// Picks the single real entry whose actual time is closest to the "HH:MM"
// the student picked — real check-ins land at whatever minute the camera
// happened to fire, not on a clean grid, so this is a nearest-match, not an
// exact one.
function closestEntryTo(entries, hhmm) {
  if (entries.length === 0) return [];
  const [h, m] = hhmm.split(":").map(Number);
  const targetMinutes = h * 60 + m;
  let best = entries[0];
  let bestDiff = Math.abs(minutesOfDay(best.detected_at) - targetMinutes);
  for (const entry of entries.slice(1)) {
    const diff = Math.abs(minutesOfDay(entry.detected_at) - targetMinutes);
    if (diff < bestDiff) {
      best = entry;
      bestDiff = diff;
    }
  }
  return [best];
}

// Explains, in plain language, whether this food is a good one to give again
// for this mood — grounded in the REAL rule engine's own rules and the REAL
// per-nutrient medians it's evaluated against (same numbers
// ml/rule_engine.py itself uses), not a new invented rule. Also encourages
// variety rather than repeating one food daily, since relying on a single
// food every time isn't good nutrition practice even if it technically fits.
function explainFood(nutrients, mood, rules, medians) {
  const moodLabel = mood.charAt(0).toUpperCase() + mood.slice(1);
  const moodRules = rules[mood.toLowerCase()] || [];

  if (moodRules.length === 0) {
    return `${moodLabel} has no specific nutrient rule, so this is a safe everyday choice — just vary what you eat day to day rather than repeating the same food constantly.`;
  }

  const passedAll = moodRules.every((rule) => {
    const [direction, ...rest] = rule.split("_");
    const key = rest.join("_");
    return direction === "high" ? nutrients[key] >= medians[key] : nutrients[key] <= medians[key];
  });
  const nutrientNames = moodRules.map((rule) => NUTRIENT_LABELS[rule.split("_").slice(1).join("_")]).join(" and ");

  if (passedAll) {
    return `Good to give again when the mood is ${moodLabel} — it's naturally rich in ${nutrientNames}. Still, space repeats out over a few days rather than every check-in; no single food should be relied on daily.`;
  }
  return `This was suggested for ${moodLabel}, but isn't actually a strong match for what ${moodLabel} usually needs (${nutrientNames}) — fine occasionally, but not the best repeat pick for this mood.`;
}

// Real mood + real food history, with each food's real nutrients and a real
// explanation of why it fit (or didn't fit) that check-in's mood — pick any
// real date to see that day's check-ins, so the student can see an actual
// rule, not just a name.
export default function MoodHistoryCard({ hidden, focused, studentId }) {
  const [history, setHistory] = useState(null);
  const [rules, setRules] = useState(null);
  const [medians, setMedians] = useState(null);
  const [expandedFood, setExpandedFood] = useState(null); // `${entryIndex}-${food}` or null
  const [nutrientCache, setNutrientCache] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  useEffect(() => {
    if (!studentId) {
      setHistory([]);
      return;
    }
    fetch(`${API_BASE}/api/students/${studentId}/nutrition-history?limit=100`)
      .then((res) => res.json())
      .then((rows) => {
        setHistory(rows);
        if (rows.length > 0) setSelectedDate(localDateOf(rows[0].detected_at));
      })
      .catch(() => setHistory([]));
    fetch(`${API_BASE}/api/mood-rules`)
      .then((res) => res.json())
      .then((data) => {
        setRules(data.rules);
        setMedians(data.medians);
      })
      .catch(() => {});
  }, [studentId]);

  const entriesForSelectedDate = (history || []).filter((e) => localDateOf(e.detected_at) === selectedDate);
  const displayedEntries = selectedTime ? closestEntryTo(entriesForSelectedDate, selectedTime) : entriesForSelectedDate;

  function handleDateChange(newDate) {
    setSelectedDate(newDate);
    setSelectedTime("");
  }

  async function toggleFood(key, food) {
    if (expandedFood === key) {
      setExpandedFood(null);
      return;
    }
    setExpandedFood(key);
    if (nutrientCache[food]) return;
    try {
      const res = await fetch(`${API_BASE}/api/foods/${encodeURIComponent(food)}`);
      if (res.ok) {
        const data = await res.json();
        setNutrientCache((prev) => ({ ...prev, [food]: data }));
      }
    } catch {
      // leave it unexpanded — the chip just won't show nutrient detail
    }
  }

  return (
    <div className={"dash-card" + (hidden ? " hide" : "") + (focused ? " focused" : "")}>
      <h2 className="heading-font">Mood &amp; Food History</h2>
      <p className="section-label" style={{ marginBottom: 10 }}>Pick a date to see that day's real check-ins</p>

      {history === null ? (
        <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal" }}>Loading…</p>
      ) : history.length === 0 ? (
        <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal" }}>
          No check-ins yet.
        </p>
      ) : (
        <>
          <div className="mood-history-date-row">
            <label htmlFor="mood-history-date-input" className="section-label" style={{ margin: 0 }}>
              Date
            </label>
            <input
              type="date"
              id="mood-history-date-input"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            <label htmlFor="mood-history-time-input" className="section-label" style={{ margin: 0 }}>
              Time
            </label>
            <input
              type="time"
              id="mood-history-time-input"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              disabled={entriesForSelectedDate.length === 0}
            />
            {selectedTime && (
              <button type="button" className="mood-history-time-clear" onClick={() => setSelectedTime("")}>
                Clear
              </button>
            )}
          </div>
          {selectedTime && displayedEntries.length > 0 && (
            <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal", marginBottom: 10 }}>
              Closest real check-in to {selectedTime}: {formatHistoryTimestamp(displayedEntries[0].detected_at)}
            </p>
          )}
          {displayedEntries.length === 0 ? (
            <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal" }}>
              No check-in on this date.
            </p>
          ) : (
        <ul className="mood-history-list">
          {displayedEntries.map((entry, i) => (
            <li key={entry.mood_id} className="mood-history-entry">
              <div className="mood-history-entry-head">
                <span className="mood-history-mood">
                  {entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}
                  {entry.subject ? ` — ${entry.subject}` : ""}
                </span>
                <span className="mood-history-time mono">{formatHistoryTimestamp(entry.detected_at)}</span>
              </div>
              <div className="mood-history-foods">
                {entry.foods.slice(0, MAX_FOODS_PER_ENTRY).map((food) => {
                  const key = `${i}-${food}`;
                  const isOpen = expandedFood === key;
                  const nutrients = nutrientCache[food];
                  return (
                    <div key={food} className="mood-history-food-wrap">
                      <button type="button" className="mood-history-food-chip" onClick={() => toggleFood(key, food)}>
                        {foodImageUrl(food) && <img src={foodImageUrl(food)} alt="" loading="lazy" />}
                        {food}
                      </button>
                      {isOpen && (
                        <div className="mood-history-food-detail">
                          {!nutrients ? (
                            <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal", margin: 0 }}>
                              Loading real nutrients…
                            </p>
                          ) : (
                            <>
                              <div className="mood-history-nutrient-rows">
                                {Object.entries(NUTRIENT_LABELS).map(([key2, label]) => (
                                  <span key={key2}>
                                    {label}: {nutrients[key2]}
                                  </span>
                                ))}
                              </div>
                              {rules && medians && (
                                <p className="mood-history-explain">{explainFood(nutrients, entry.mood, rules, medians)}</p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {entry.foods.length > MAX_FOODS_PER_ENTRY && (
                  <span className="mood-history-more">+{entry.foods.length - MAX_FOODS_PER_ENTRY} more</span>
                )}
              </div>
            </li>
          ))}
        </ul>
          )}
        </>
      )}
    </div>
  );
}
