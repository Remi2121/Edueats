import "./Overview.css";

export default function StudySummaryCard({ latestMood, nutritionOnTrack, studyMinutes }) {
  return (
    <div className="dash-card">
      <h2 className="heading-font">Study's Summary</h2>
      <div className="summary-list">
        <div className="summary-row">
          <span className="summary-row-label">{latestMood.emoji} Mood</span>
          <span className="summary-row-value">{latestMood.name}</span>
        </div>
        <div className="summary-row">
          <span className="summary-row-label">🌱 Nutrition</span>
          <span className={"summary-row-value" + (nutritionOnTrack ? " good" : " warn")}>
            {nutritionOnTrack ? "On Track" : "Needs Attention"}
          </span>
        </div>
        <div className="summary-row">
          <span className="summary-row-label">⏱️ Study Time</span>
          <span className="summary-row-value">{studyMinutes} min</span>
        </div>
      </div>
    </div>
  );
}
