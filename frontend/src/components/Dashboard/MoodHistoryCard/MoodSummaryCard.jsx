import { MOODS } from "../../../data/moods";
import "./MoodSummaryCard.css";

// Real percentages computed from the actual check-in timeline — using our
// CNN's real 7 mood categories (Happy/Sad/Angry/Fear/Disgust/Neutral/
// Surprise), not invented states like "Focused" or "Stressed" that the
// model doesn't actually detect.
export default function MoodSummaryCard({ timeline }) {
  const counts = {};
  timeline.forEach((entry) => {
    counts[entry.mood.name] = (counts[entry.mood.name] || 0) + 1;
  });
  const total = timeline.length;

  const breakdown = MOODS
    .map((m) => ({ mood: m, pct: total ? Math.round(((counts[m.name] || 0) / total) * 100) : 0 }))
    .filter((b) => b.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="dash-card">
      <h2 className="heading-font">Mood Summary</h2>
      <p className="section-label">Based on your real check-in history</p>
      {breakdown.length === 0 ? (
        <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal" }}>No check-ins yet.</p>
      ) : (
        <div className="mood-summary-chips">
          {breakdown.map(({ mood, pct }) => (
            <div key={mood.name} className="mood-summary-chip" style={{ background: mood.bg, color: mood.ink }}>
              <span>{mood.emoji}</span>
              <span className="mood-summary-name">{mood.name}</span>
              <span className="mood-summary-pct">{pct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
