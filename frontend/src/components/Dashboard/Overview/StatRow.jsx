import "./Overview.css";

// studyMinutes is real, summed server-side from each session's actual
// started_at/ended_at — not an estimate. nutritionOnTrack is the same real
// flag the Study Summary card already derives from the latest mood.
export default function StatRow({ latestMood, studyMinutes, nutritionOnTrack }) {
  return (
    <div className="stat-row">
      <div className="stat-card">
        <div className="stat-icon stat-icon-mint">{latestMood.emoji}</div>
        <div>
          <p className="stat-label">Current Mood</p>
          <p className="stat-value">{latestMood.name}</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon stat-icon-blue">📖</div>
        <div>
          <p className="stat-label">Today's Study Time</p>
          <p className="stat-value">{studyMinutes} min</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon stat-icon-amber">🌱</div>
        <div>
          <p className="stat-label">Nutrition</p>
          <p className={"stat-value" + (nutritionOnTrack ? " good" : " warn")}>
            {nutritionOnTrack ? "On Track" : "Needs Attention"}
          </p>
        </div>
      </div>
    </div>
  );
}
