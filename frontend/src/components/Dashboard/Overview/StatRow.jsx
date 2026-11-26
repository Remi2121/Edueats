import "./Overview.css";

// All four values are real: studyMinutes is summed server-side from actual
// session rows, focusAvg is the mean of the real per-subject focus scores
// (null until enough check-ins exist to compute one), and foodCount is the
// real number of foods the rule engine matched for the latest mood.
export default function StatRow({ latestMood, studyMinutes, focusAvg, foodCount }) {
  return (
    <div className="stat-row">
      <div className="stat-card bento-stat-card">
        <div className="stat-icon stat-icon-blue" aria-hidden="true">⏱️</div>
        <div className="stat-card-body">
          <p className="stat-label">Study time this week</p>
          <p className="stat-value">{Math.floor(studyMinutes / 60)}h {studyMinutes % 60}m</p>
        </div>
      </div>

      <div className="stat-card bento-stat-card">
        <div className="stat-icon stat-icon-mint" aria-hidden="true">🎯</div>
        <div className="stat-card-body">
          <p className="stat-label">Average focus score</p>
          <p className="stat-value">{focusAvg != null ? `${focusAvg}%` : "—"}</p>
        </div>
      </div>

      <div className="stat-card bento-stat-card">
        <div className="stat-icon stat-icon-amber" aria-hidden="true">{latestMood.emoji}</div>
        <div className="stat-card-body">
          <p className="stat-label">Current mood</p>
          <p className="stat-value">{latestMood.name}</p>
        </div>
      </div>

      <div className="stat-card bento-stat-card">
        <div className="stat-icon stat-icon-blue" aria-hidden="true">🍽️</div>
        <div className="stat-card-body">
          <p className="stat-label">Food suggestions</p>
          <p className="stat-value">{foodCount}</p>
        </div>
      </div>
    </div>
  );
}
