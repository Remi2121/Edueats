import { useEffect, useState } from "react";
import { formatHistoryTimestamp } from "../../../data/moods";
import { foodImageUrl } from "../../../data/foodImages";
import "./NutritionCard.css";

const API_BASE = "http://localhost:3000";

const NUTRIENT_ROWS = [
  ["Calories", "calories", "kcal"],
  ["Fat", "fat_g", "g"],
  ["Sugar", "sugar_g", "g"],
  ["Water", "water_ml", "ml"],
  ["Magnesium", "magnesium_mg", "mg"],
  ["Vitamin B", "vitamin_b_mg", "mg"],
];

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
    if (tab !== "log" || !studentId || logHistory !== null) return;
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
      <h2 className="heading-font">My Nutrition</h2>
      <div className="nutrition-tabs">
        <button className={"nutrition-tab" + (tab === "recommended" ? " active" : "")} type="button" onClick={() => setTab("recommended")}>
          Recommended
        </button>
        <button className={"nutrition-tab" + (tab === "log" ? " active" : "")} type="button" onClick={() => setTab("log")}>
          My Food Log
        </button>
      </div>

      {tab === "log" ? (
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
          <p className="section-label" style={{ marginTop: 14 }}>Today's Food Recommendation</p>
          <div className="food-cards">
            {snacks.map((food) => (
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
