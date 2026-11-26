import { MOODS } from "../../../data/moods";
import "./Overview.css";

// Real mood distribution — how many of the real recent check-ins (entries,
// the same real timeline used elsewhere on this page) landed on each of the
// 7 real FER-2013 moods. Matches the approved student-app reference
// mockup's "Mood distribution" panel (a counted bar list), replacing the
// earlier custom SVG valence-trend chart this page used before.
export default function MoodTrendCard({ entries }) {
  const counts = MOODS.map((m) => ({
    mood: m,
    count: entries.filter((e) => e.mood.name === m.name).length,
  }));
  const total = entries.length;

  return (
    <div className="dash-card">
      <h2 className="heading-font">Mood Distribution</h2>
      <p className="section-label" style={{ marginTop: -10 }}>Based on your real check-in history</p>
      {total === 0 ? (
        <p className="trend-empty">Not enough check-ins yet to show a distribution.</p>
      ) : (
        <>
          <div className="distribution-list">
            {counts.map(({ mood, count }) => (
              <div className="distribution-row" key={mood.name}>
                <span className="distribution-label">{mood.emoji} {mood.name}</span>
                <div className="progress-track">
                  <i style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                </div>
                <b>{count}</b>
              </div>
            ))}
          </div>
          <p className="footnote">Mood labels are model outputs, not clinical assessments.</p>
        </>
      )}
    </div>
  );
}
