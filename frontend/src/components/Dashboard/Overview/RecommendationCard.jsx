import { foodImageUrl } from "../../../data/foodImages";
import "./Overview.css";

// This card is a compact snapshot, not a full list — a mood with no
// nutrient rule (Neutral/Surprise) can legitimately match all 93 real
// foods, so only a small highlight set is shown here. The full real list
// is still available on the My Nutrition page.
const SNAPSHOT_FOOD_COUNT = 4;

export default function RecommendationCard({ snacks, onNavigate }) {
  const top = snacks.slice(0, SNAPSHOT_FOOD_COUNT);
  return (
    <div className="dash-card recommendation-card">
      <div className="card-head">
        <div>
          <h2 className="heading-font">Today's Food Inspiration</h2>
          <p className="section-label" style={{ margin: 0 }}>Fuel your focus with the right food</p>
        </div>
        <span className="pill">✨ Recommended</span>
      </div>
      <div className="food-banner">
        <div>
          <strong>{top.join(" + ") || "Check in to get a suggestion"}</strong>
          <p>Matched to your current mood by the real rule engine.</p>
          <div className="recommendation-tags">
            <span className="recommendation-tag">💡 Boosts concentration</span>
            <span className="recommendation-tag">⚡ Reduces tiredness</span>
          </div>
        </div>
        <div className="recommendation-foods">
          {top.map((food) => (
            foodImageUrl(food) ? (
              <img key={food} className="recommendation-food-img" src={foodImageUrl(food)} alt={food} loading="lazy" />
            ) : (
              <span key={food} className="recommendation-food-img recommendation-food-img-fallback">🍽️</span>
            )
          ))}
        </div>
      </div>
      {onNavigate && (
        <button className="text-link" type="button" onClick={() => onNavigate("nutrition")}>
          Explore nutrition →
        </button>
      )}
    </div>
  );
}
