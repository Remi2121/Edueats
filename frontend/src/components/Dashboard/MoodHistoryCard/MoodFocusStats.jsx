import "../Overview/Overview.css";

// All three values are real: latestMood is the student's most recent real
// check-in, the middle card names the real subject with the highest real
// focus score (not an average — the student asked to see which subject
// they focus best in, by name), and checkinsCount is the real number of
// mood check-ins on record.
export default function MoodFocusStats({ latestMood, subjects, checkinsCount }) {
  const topSubject = subjects.length
    ? [...subjects].sort((a, b) => b.score - a.score)[0]
    : null;

  return (
    <div className="stat-row">
      <div className="stat-card bento-stat-card">
        <div className="stat-icon stat-icon-amber" aria-hidden="true">{latestMood.emoji}</div>
        <div className="stat-card-body">
          <p className="stat-label">Latest mood</p>
          <p className="stat-value">{latestMood.name}</p>
        </div>
      </div>

      <div className="stat-card bento-stat-card">
        <div className="stat-icon stat-icon-mint" aria-hidden="true">🎯</div>
        <div className="stat-card-body">
          <p className="stat-label">Best focus subject</p>
          <p className="stat-value">{topSubject ? topSubject.name : "—"}</p>
          {topSubject && <p className="bento-progress-sub">{topSubject.score}% focus</p>}
        </div>
      </div>

      <div className="stat-card bento-stat-card">
        <div className="stat-icon stat-icon-blue" aria-hidden="true">📅</div>
        <div className="stat-card-body">
          <p className="stat-label">Check-ins recorded</p>
          <p className="stat-value">{checkinsCount}</p>
        </div>
      </div>
    </div>
  );
}
