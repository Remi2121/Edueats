import CardHead from "../shared/CardHead";
import "./Overview.css";
import "../ClassSessionCard/ClassSessionCard.css"; // reuses .cam-caption

// Compact preview of the most recent real parent alerts — the full
// day-windowed list (with pagination) lives on Mood & Focus.
export default function AlertsPreviewCard({ alerts, onNavigate }) {
  const top = alerts.slice(0, 2);
  return (
    <div className="dash-card">
      <CardHead
        icon="🔔"
        title="Recent alerts"
        sub={`${alerts.length} recent update${alerts.length === 1 ? "" : "s"}`}
        action={<button className="text-link" type="button" onClick={() => onNavigate("moodfocus")}>See all</button>}
      />
      {top.length === 0 ? (
        <p className="cam-caption" style={{ textAlign: "left" }}>No alerts sent yet.</p>
      ) : (
        <div className="alert-mini-list">
          {top.map((a, i) => (
            <div className="alert-mini-row" key={i}>
              <span className="alert-mini-icon" aria-hidden="true">🔔</span>
              <div>
                <b>{a.mood.name} detected{a.subject ? ` during ${a.subject}` : ""}</b>
                <small>{a.time}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
