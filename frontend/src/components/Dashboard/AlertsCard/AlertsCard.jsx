import { useState } from "react";
import "./AlertsCard.css";

const WINDOW_STEP_DAYS = 5;
const MAX_WINDOW_DAYS = 15;

// Whole calendar days back from today (0 = today, 1 = yesterday, ...) for a
// real alert timestamp — used to show only the last N days at a time
// instead of dumping the student's entire alert history on screen at once.
function daysAgo(sentAt) {
  if (!sentAt) return 0; // a just-created alert (no sentAt yet) always counts as "today"
  const sentDay = new Date(sentAt);
  sentDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today - sentDay) / (24 * 60 * 60 * 1000));
}

export default function AlertsCard({ hidden, focused, alerts }) {
  const [windowDays, setWindowDays] = useState(WINDOW_STEP_DAYS);

  const visible = alerts.filter((a) => daysAgo(a.sentAt) < windowDays);
  const hasMoreBeyondWindow = alerts.some((a) => daysAgo(a.sentAt) >= windowDays);
  const canExpand = windowDays < MAX_WINDOW_DAYS && hasMoreBeyondWindow;

  return (
    <div className={"dash-card" + (hidden ? " hide" : "") + (focused ? " focused" : "")}>
      <h2 className="heading-font">Recent Alerts to Parent</h2>
      <p className="section-label" style={{ marginTop: -10 }}>Showing the last {windowDays} days</p>
      <ul className="alerts-list">
        {visible.length === 0 && <li className="alerts-empty">No alerts sent in this period.</li>}
        {visible.map((a, i) => (
          <li key={i} className="alert-item">
            <span className="alert-dot" style={{ background: a.mood.bg }} />
            <span className="alert-text">
              {a.mood.name} detected{a.subject ? ` during ${a.subject}` : ""} — parent notified
              {a.foods && a.foods.length > 0 ? ` (suggested: ${a.foods.slice(0, 3).join(", ")})` : ""}
            </span>
            <span className="alert-time mono">{a.time}</span>
          </li>
        ))}
      </ul>
      {canExpand && (
        <button
          type="button"
          className="alerts-expand-btn"
          onClick={() => setWindowDays((d) => Math.min(d + WINDOW_STEP_DAYS, MAX_WINDOW_DAYS))}
        >
          ▼ Show {Math.min(windowDays + WINDOW_STEP_DAYS, MAX_WINDOW_DAYS)} days
        </button>
      )}
    </div>
  );
}
