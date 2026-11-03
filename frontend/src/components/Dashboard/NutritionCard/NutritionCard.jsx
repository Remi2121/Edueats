import { useState } from "react";
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

export default function NutritionCard({ hidden, focused, snacks }) {
  const [tab, setTab] = useState("recommended");
  const [selected, setSelected] = useState(null);
  const [selectedNutrients, setSelectedNutrients] = useState(null);
  const [loadError, setLoadError] = useState("");

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
        <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal", marginTop: 14 }}>
          Food logging isn't built yet — this tab is a placeholder for a future update.
        </p>
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
                <span className="food-card-icon">🍽️</span>
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
