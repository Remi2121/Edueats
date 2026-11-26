import "./Overview.css";

// studyMinutes is real, summed server-side from each session's actual
// started_at/ended_at — not an estimate. nutritionOnTrack is the same real
// flag the Study Summary card already derives from the latest mood.
export default function StatRow({ latestMood, studyMinutes, nutritionOnTrack }) {
  const goalMinutes = 60;
  const goalPct = Math.min(100, Math.round((studyMinutes / goalMinutes) * 100));

  return (
    <div className="stat-row">
      {/* Bento Card 1: Current Mood */}
      <div className="stat-card bento-stat-card">
        <div className="stat-icon stat-icon-mint" aria-hidden="true">
          {latestMood.emoji}
        </div>
        <div className="stat-card-body">
          <p className="stat-label">Current Mood</p>
          <p className="stat-value">{latestMood.name}</p>
          <div className="bento-badge">
            <span className="bento-dot" style={{ background: latestMood.concerning ? "#EF4444" : "#10B981" }} />
            <span>{latestMood.concerning ? "Needs Rest" : "Feeling Great"}</span>
          </div>
        </div>
      </div>

      {/* Bento Card 2: Today's Study Time */}
      <div className="stat-card bento-stat-card">
        <div className="stat-icon stat-icon-blue" aria-hidden="true">
          📖
        </div>
        <div className="stat-card-body">
          <p className="stat-label">Today's Study Time</p>
          <p className="stat-value">{studyMinutes} min</p>
          <div className="bento-progress-wrap">
            <div className="bento-progress-bar">
              <div className="bento-progress-fill" style={{ width: `${goalPct}%` }} />
            </div>
            <span className="bento-progress-sub">{goalPct}% of 1h goal</span>
          </div>
        </div>
      </div>

      {/* Bento Card 3: Nutrition */}
      <div className="stat-card bento-stat-card">
        <div className="stat-icon stat-icon-amber" aria-hidden="true">
          🌱
        </div>
        <div className="stat-card-body">
          <p className="stat-label">Nutrition</p>
          <p className={"stat-value" + (nutritionOnTrack ? " good" : " warn")}>
            {nutritionOnTrack ? "On Track" : "Needs Attention"}
          </p>
          <div className="bento-badge">
            <span>{nutritionOnTrack ? "✨ Optimal brain fuel" : "🍎 Snack recommended"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
