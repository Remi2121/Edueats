import { useEffect, useState } from "react";
import { formatHistoryTimestamp } from "../../../data/moods";
import { foodImageUrl } from "../../../data/foodImages";
import "./NutritionCard.css";

const API_BASE = "http://localhost:3000";

// Neutral/Surprise have no nutrient rule, so the real rule engine returns
// every food in the dataset for them (93 foods) — real data, but far too
// many cards to usefully show at once.
const MAX_DISPLAYED_FOODS = 10;

const NUTRIENT_ROWS = [
  ["Calories", "calories", "kcal"],
  ["Fat", "fat_g", "g"],
  ["Sugar", "sugar_g", "g"],
  ["Water", "water_ml", "ml"],
  ["Magnesium", "magnesium_mg", "mg"],
  ["Vitamin B", "vitamin_b_mg", "mg"],
];

// Local calendar date (YYYY-MM-DD) for a real timestamp, matching what
// <input type="date"> itself works in — using the LOCAL date, not UTC, so a
// check-in from this evening doesn't get filed under tomorrow for anyone
// east of UTC.
function localDateOf(isoString) {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Minutes since local midnight for a real timestamp — used to find which
// real check-in is closest to a picked time-of-day.
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

export default function NutritionCard({ hidden, focused, snacks, studentId }) {
  const [tab, setTab] = useState("recommended");
  const [selected, setSelected] = useState(null);
  const [selectedNutrients, setSelectedNutrients] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [foodOptions, setFoodOptions] = useState([]);
  const [logChoice, setLogChoice] = useState("");
  const [logHistory, setLogHistory] = useState(null);
  const [logSaving, setLogSaving] = useState(false);
  const [logError, setLogError] = useState("");

  const [detailsQuery, setDetailsQuery] = useState("");

  const [history, setHistory] = useState(null);
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  // Which past check-in's foods are currently shown — only one at a time,
  // collapsed by default, so the tab doesn't dump every past check-in's
  // full food list on screen at once.
  const [openEntry, setOpenEntry] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // Real past check-ins (most recent first) instead of just "today's"
  // single recommendation — each with the real mood and real foods the
  // rule engine matched at that time. Fetches a real window of history so
  // the date picker below has real dates to filter, not just the latest few.
  useEffect(() => {
    if (!studentId) {
      setHistory([]);
      return;
    }
    fetch(`${API_BASE}/api/students/${studentId}/nutrition-history?limit=50`)
      .then((res) => res.json())
      .then((rows) => {
        setHistory(rows);
        if (rows.length > 0) {
          setSelectedDate(localDateOf(rows[0].detected_at));
          setOpenEntry(rows[0].mood_id);
        }
      })
      .catch(() => setHistory([]));
  }, [studentId]);

  const entriesForSelectedDate = (history || []).filter((e) => localDateOf(e.detected_at) === selectedDate);

  // A real check-in happens at whatever time the camera caught it, not on a
  // fixed clock grid — so "selecting a time" means finding the single real
  // check-in closest to that time, not demanding an exact match.
  const displayedEntries = selectedTime ? closestEntryTo(entriesForSelectedDate, selectedTime) : entriesForSelectedDate;

  function handleDateChange(newDate) {
    setSelectedDate(newDate);
    setSelectedTime("");
    const firstForDate = (history || []).find((e) => localDateOf(e.detected_at) === newDate);
    setOpenEntry(firstForDate ? firstForDate.mood_id : null);
  }

  function handleTimeChange(newTime) {
    setSelectedTime(newTime);
    if (!newTime) return;
    const [match] = closestEntryTo(entriesForSelectedDate, newTime);
    setOpenEntry(match ? match.mood_id : null);
  }

  function toggleExpanded(moodId) {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(moodId)) next.delete(moodId);
      else next.add(moodId);
      return next;
    });
  }

  async function selectFood(food) {
    setSelected(food);
    setSelectedNutrients(null);
    setLoadError("");
    try {
      const res = await fetch(`${API_BASE}/api/foods/${encodeURIComponent(food)}`);
      if (!res.ok) {
        setLoadError("No nutrient data found for this food.");
        return;
      }
      setSelectedNutrients(await res.json());
    } catch {
      setLoadError("Could not reach the server.");
    }
  }

  // loads the real food list + this student's real log history the first
  // time they open the My Food Log tab
  useEffect(() => {
    if ((tab !== "log" && tab !== "details") || !studentId || logHistory !== null) return;
    fetch(`${API_BASE}/api/foods`)
      .then((res) => res.json())
      .then((names) => {
        setFoodOptions(names);
        setLogChoice(names[0] || "");
      })
      .catch(() => {});
    fetch(`${API_BASE}/api/students/${studentId}/food-log`)
      .then((res) => res.json())
      .then(setLogHistory)
      .catch(() => setLogHistory([]));
  }, [tab, studentId, logHistory]);

  async function logFood() {
    if (!logChoice || !studentId) return;
    setLogSaving(true);
    setLogError("");
    try {
      const res = await fetch(`${API_BASE}/api/students/${studentId}/food-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ food_name: logChoice }),
      });
      if (!res.ok) {
        setLogError("Could not log that food.");
        return;
      }
      const entry = await res.json();
      setLogHistory((prev) => [{ ...entry, logged_at: new Date().toISOString() }, ...(prev || [])]);
    } catch {
      setLogError("Could not reach the server.");
    } finally {
      setLogSaving(false);
    }
  }

  return (
    <div className={"dash-card" + (hidden ? " hide" : "") + (focused ? " focused" : "")}>
      <div className="nutrition-tabs">
        <button className={"nutrition-tab" + (tab === "recommended" ? " active" : "")} type="button" onClick={() => setTab("recommended")}>
          Recommended
        </button>
        <button className={"nutrition-tab" + (tab === "log" ? " active" : "")} type="button" onClick={() => setTab("log")}>
          My Food Log
        </button>
        <button className={"nutrition-tab" + (tab === "details" ? " active" : "")} type="button" onClick={() => setTab("details")}>
          Nutrition Details
        </button>
      </div>

      {tab === "details" ? (
        <>
          <p className="section-label" style={{ marginTop: 14, textTransform: "none", letterSpacing: "normal" }}>
            View the nutrition details of every food you have logged.
          </p>
          <input
            type="text"
            className="nutrition-details-search"
            placeholder="Search banana, rice, egg..."
            value={detailsQuery}
            onChange={(e) => setDetailsQuery(e.target.value)}
          />
          <ul className="food-record-list">
            {logHistory === null && <li className="food-log-empty">Loading…</li>}
            {logHistory && logHistory.length === 0 && (
              <li className="food-log-empty">Nothing logged yet — log a food in the My Food Log tab first.</li>
            )}
            {logHistory &&
              logHistory
                .filter((e) => e.food_name.toLowerCase().includes(detailsQuery.trim().toLowerCase()))
                .map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={"food-record" + (selected === entry.food_name ? " selected" : "")}
                      onClick={() => selectFood(entry.food_name)}
                    >
                      {foodImageUrl(entry.food_name) ? (
                        <img className="food-record-img" src={foodImageUrl(entry.food_name)} alt="" loading="lazy" />
                      ) : (
                        <span className="food-record-img food-log-img-fallback">🍽️</span>
                      )}
                      <span className="food-record-name">
                        {entry.food_name}
                        <small>{formatHistoryTimestamp(entry.logged_at)}</small>
                      </span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </li>
                ))}
          </ul>

          {selected && (
            <div className="nutrition-details">
              <p className="section-label">Nutrition Details — {selected}</p>
              {loadError && <p className="settings-row-hint">{loadError}</p>}
              {selectedNutrients && (
                <div className="nutrient-rows">
                  {NUTRIENT_ROWS.map(([label, key, unit]) => (
                    <div key={key} className="nutrient-row">
                      <span>{label}</span>
                      <span className="mono">{selectedNutrients[key]} {unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : tab === "log" ? (
        <>
          <p className="section-label" style={{ marginTop: 14 }}>Log a Food You Ate</p>
          <div className="field-row food-log-form">
            <div className="field">
              <select value={logChoice} onChange={(e) => setLogChoice(e.target.value)}>
                {foodOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary food-log-btn" type="button" onClick={logFood} disabled={logSaving || !logChoice}>
              {logSaving ? "Logging…" : "Log it"}
            </button>
          </div>
          {logError && <p className="settings-row-hint">{logError}</p>}

          <p className="section-label">Recent Food Log</p>
          <ul className="food-log-list">
            {logHistory === null && <li className="food-log-empty">Loading…</li>}
            {logHistory && logHistory.length === 0 && (
              <li className="food-log-empty">Nothing logged yet — pick a food above and log it.</li>
            )}
            {logHistory && logHistory.map((entry) => (
              <li key={entry.id} className="food-log-item">
                {foodImageUrl(entry.food_name) ? (
                  <img className="food-log-img" src={foodImageUrl(entry.food_name)} alt="" loading="lazy" />
                ) : (
                  <span className="food-log-img food-log-img-fallback">🍽️</span>
                )}
                <span className="food-log-name">{entry.food_name}</span>
                <span className="food-log-time mono">{formatHistoryTimestamp(entry.logged_at)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {history === null ? (
            <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal", marginTop: 14 }}>
              Loading your real check-in history…
            </p>
          ) : history.length === 0 ? (
            <>
              <p className="section-label" style={{ marginTop: 14 }}>Today's Food Recommendation</p>
              <div className="food-cards">
                {snacks.slice(0, MAX_DISPLAYED_FOODS).map((food) => (
                  <button
                    key={food}
                    className={"food-card" + (selected === food ? " selected" : "")}
                    type="button"
                    onClick={() => selectFood(food)}
                  >
                    {foodImageUrl(food) ? (
                      <img className="food-card-img" src={foodImageUrl(food)} alt="" loading="lazy" />
                    ) : (
                      <span className="food-card-icon">🍽️</span>
                    )}
                    <span className="food-card-name">{food}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="nutrition-date-row" style={{ marginTop: 14 }}>
                <label htmlFor="nutrition-date-input" className="section-label" style={{ margin: 0 }}>
                  Date
                </label>
                <input
                  type="date"
                  id="nutrition-date-input"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
                <label htmlFor="nutrition-time-input" className="section-label" style={{ margin: 0 }}>
                  Time
                </label>
                <input
                  type="time"
                  id="nutrition-time-input"
                  value={selectedTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={entriesForSelectedDate.length === 0}
                />
                {selectedTime && (
                  <button type="button" className="nutrition-time-clear" onClick={() => handleTimeChange("")}>
                    Clear
                  </button>
                )}
              </div>
              {selectedTime && displayedEntries.length > 0 && (
                <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal", marginTop: -6, marginBottom: 10 }}>
                  Closest real check-in to {selectedTime}: {formatHistoryTimestamp(displayedEntries[0].detected_at)}
                </p>
              )}
              {displayedEntries.length === 0 ? (
                <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal", marginTop: 10 }}>
                  No check-in on this date.
                </p>
              ) : (
                displayedEntries.map((entry, i) => {
              const isOpen = openEntry === entry.mood_id;
              const expanded = expandedEntries.has(entry.mood_id);
              const shownFoods = expanded ? entry.foods : entry.foods.slice(0, MAX_DISPLAYED_FOODS);
              const moodLabel = entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1);
              return (
                <div key={entry.mood_id} className="nutrition-history-entry">
                  <button
                    type="button"
                    className={"nutrition-history-header" + (isOpen ? " open" : "")}
                    style={{ marginTop: i === 0 ? 14 : 10 }}
                    onClick={() => setOpenEntry(isOpen ? null : entry.mood_id)}
                  >
                    <span className="section-label" style={{ margin: 0 }}>
                      {formatHistoryTimestamp(entry.detected_at)}
                      {" — "}
                      {moodLabel}
                      {entry.subject ? ` (${entry.subject})` : ""}
                    </span>
                    <span className="nutrition-history-chevron">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <>
                      <div className="food-cards">
                        {shownFoods.map((food) => (
                          <button
                            key={food}
                            className={"food-card" + (selected === food ? " selected" : "")}
                            type="button"
                            onClick={() => selectFood(food)}
                          >
                            {foodImageUrl(food) ? (
                              <img className="food-card-img" src={foodImageUrl(food)} alt="" loading="lazy" />
                            ) : (
                              <span className="food-card-icon">🍽️</span>
                            )}
                            <span className="food-card-name">{food}</span>
                          </button>
                        ))}
                      </div>
                      {entry.foods.length > MAX_DISPLAYED_FOODS && (
                        <button
                          type="button"
                          className="nutrition-history-expand"
                          onClick={() => toggleExpanded(entry.mood_id)}
                        >
                          {expanded ? "Show fewer" : `+${entry.foods.length - MAX_DISPLAYED_FOODS} more match this mood`}
                        </button>
                      )}
                    </>
                  )}
                </div>
                  );
                })
              )}
            </>
          )}

          {selected && (
            <div className="nutrition-details">
              <p className="section-label">Nutrition Details — {selected}</p>
              {loadError && <p className="settings-row-hint">{loadError}</p>}
              {selectedNutrients && (
                <div className="nutrient-rows">
                  {NUTRIENT_ROWS.map(([label, key, unit]) => (
                    <div key={key} className="nutrient-row">
                      <span>{label}</span>
                      <span className="mono">{selectedNutrients[key]} {unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
