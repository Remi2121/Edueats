import "./MoodHistoryCard.css";

export default function MoodHistoryCard({ hidden, focused, latestMood, moodUpdatedLabel, timeline }) {
  return (
    <div className={"dash-card" + (hidden ? " hide" : "") + (focused ? " focused" : "")}>
      <h2 className="heading-font">Mood History</h2>
      <div className="mood-chip-lg" style={{ background: latestMood.bg, color: latestMood.ink }}>
        {latestMood.emoji} {latestMood.name}
      </div>
      <p className="mood-updated mono">{moodUpdatedLabel}</p>
      <p className="section-label">All past check-ins</p>
      <div className="mood-timeline">
        {timeline.map((entry, i) => (
          <span
            key={i}
            className="mood-dot"
            style={{ background: entry.mood.bg }}
            title={`${entry.mood.name} — ${entry.when}`}
          />
        ))}
      </div>
    </div>
  );
}
