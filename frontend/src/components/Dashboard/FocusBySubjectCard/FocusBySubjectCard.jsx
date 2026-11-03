import "./FocusBySubjectCard.css";

export default function FocusBySubjectCard({ hidden, subjects }) {
  const sorted = [...subjects].sort((a, b) => b.score - a.score);
  return (
    <div className={"dash-card" + (hidden ? " hide" : "")}>
      <h2 className="heading-font">Focus by Subject</h2>
      <p className="section-label">Based on mood during each class today</p>
      <div className="subject-bar-list">
        {sorted.map((s, idx) => (
          <div key={s.name} className={"subject-bar-row" + (idx === 0 ? " top" : "")}>
            <span className="subject-bar-label">{s.name}</span>
            <span className="subject-bar-track">
              <span className="subject-bar-fill" style={{ width: `${s.score}%` }} />
            </span>
            <span className="subject-bar-pct mono">{s.score}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
