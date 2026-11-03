import "./Overview.css";

// studyMinutes is real, summed server-side from each session's actual
// started_at/ended_at — not an estimate.
export default function StatRow({ latestMood, studyMinutes }) {
  return (
    <div className="stat-row">
      <div className="stat-card">
        <div className="stat-icon">{latestMood.emoji}</div>
        <div>
          <p className="stat-label">Current Mood</p>
          <p className="stat-value">{latestMood.name}</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📖</div>
        <div>
          <p className="stat-label">Today's Study Time</p>
          <p className="stat-value">{studyMinutes} min</p>
        </div>
      </div>
    </div>
  );
}
