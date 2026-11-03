import "./AlertsCard.css";

// Real posture alerts from the database — only created once a 3-reading
// (45-minute) majority of checks came back "poor", not on a single reading.
export default function PostureAlertsCard({ alerts }) {
  return (
    <div className="dash-card">
      <h2 className="heading-font">Posture Alerts to Parent</h2>
      <ul className="alerts-list">
        {alerts.length === 0 && <li className="alerts-empty">No posture alerts sent yet.</li>}
        {alerts.map((a, i) => (
          <li key={i} className="alert-item">
            <span className="alert-dot" style={{ background: "#F7DAD6" }} />
            <span className="alert-text">
              Poor posture{a.subject ? ` during ${a.subject}` : ""} — parent notified
            </span>
            <span className="alert-time mono">{a.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
