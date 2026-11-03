import "./AlertsCard.css";

export default function AlertsCard({ hidden, focused, alerts }) {
  return (
    <div className={"dash-card" + (hidden ? " hide" : "") + (focused ? " focused" : "")}>
      <h2 className="heading-font">Recent Alerts to Parent</h2>
      <ul className="alerts-list">
        {alerts.length === 0 && <li className="alerts-empty">No alerts sent yet today.</li>}
        {alerts.map((a, i) => (
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
    </div>
  );
}
