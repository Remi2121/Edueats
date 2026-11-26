import { useEffect, useState } from "react";
import CardHead from "../shared/CardHead";
import "./Overview.css";
import "../ClassSessionCard/ClassSessionCard.css"; // reuses .cam-caption

const API_BASE = "http://localhost:3000";

// Real per-day minutes studied, from the same zero-filled /sessions/week
// endpoint the My Progress chart uses — shows the most recent 5 real days,
// matching the reference mockup's 5-bar week preview.
export default function StudyActivityCard({ studentId, onNavigate }) {
  const [days, setDays] = useState([]);

  useEffect(() => {
    if (!studentId) return;
    fetch(`${API_BASE}/api/students/${studentId}/sessions/week`)
      .then((res) => res.json())
      .then(setDays)
      .catch(() => {});
  }, [studentId]);

  const shown = days.slice(-5);
  const max = Math.max(...shown.map((d) => d.minutes), 1);

  return (
    <div className="dash-card">
      <CardHead
        icon="📈"
        title="Study activity"
        sub="Minutes studied this week"
        action={<button className="text-link" type="button" onClick={() => onNavigate("progress")}>View report</button>}
      />
      {shown.length === 0 ? (
        <p className="cam-caption" style={{ textAlign: "left" }}>No study sessions yet.</p>
      ) : (
        <div className="mini-bar-chart">
          {shown.map((d) => (
            <div className="mini-bar-col" key={d.day}>
              <span className="mini-bar-value">{d.minutes}m</span>
              <div className="mini-bar-track">
                <div className="mini-bar-fill" style={{ height: `${Math.max(5, (d.minutes / max) * 100)}%` }} />
              </div>
              <small>{new Date(d.day).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
