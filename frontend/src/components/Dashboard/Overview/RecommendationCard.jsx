import { foodImageUrl } from "../../../data/foodImages";
import "./Overview.css";

// This card is a compact snapshot, not a full list — a mood with no
// nutrient rule (Neutral/Surprise) can legitimately match all 93 real
// foods, so only a small highlight set is shown here. The full real list
// is still available on the My Nutrition page.
const SNAPSHOT_FOOD_COUNT = 4;

export default function RecommendationCard({ snacks }) {
  return (
    <div className="dash-card recommendation-card">
      <div>
        <h2 className="heading-font">Today's Recommendation</h2>
        <p className="section-label" style={{ marginBottom: 10 }}>Fuel your focus with the right food!</p>
        <div className="recommendation-foods">
          {snacks.slice(0, SNAPSHOT_FOOD_COUNT).map((food) => (
            <div key={food} className="recommendation-food">
              {foodImageUrl(food) ? (
                <img className="recommendation-food-img" src={foodImageUrl(food)} alt="" loading="lazy" />
              ) : (
                <span className="recommendation-food-img recommendation-food-img-fallback">🍽️</span>
              )}
              <span className="recommendation-food-name">{food}</span>
            </div>
          ))}
        </div>
        <div className="recommendation-tags">
          <span className="recommendation-tag">💡 Boosts concentration</span>
          <span className="recommendation-tag">⚡ Reduces tiredness</span>
        </div>
      </div>
    </div>
  );
}
