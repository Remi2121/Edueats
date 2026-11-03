import "./Overview.css";

export default function RecommendationCard({ snacks }) {
  return (
    <div className="dash-card recommendation-card">
      <div className="recommendation-icon">🍽️</div>
      <div>
        <h2 className="heading-font">Today's Recommendation</h2>
        <p className="section-label" style={{ marginBottom: 6 }}>Fuel your focus with the right food!</p>
        <p className="recommendation-foods">{snacks.join(" + ")}</p>
        <div className="recommendation-tags">
          <span className="recommendation-tag">💡 Boosts concentration</span>
          <span className="recommendation-tag">⚡ Reduces tiredness</span>
        </div>
      </div>
    </div>
  );
}
