import CardHead from "../shared/CardHead";
import "./Overview.css";

// A lightweight dashboard preview of the real study session — it doesn't
// duplicate the real Start flow (which includes a real Zoom-conflict check
// in ClassSessionCard), it just shows the real current session state and
// deep-links to the real Study Session page to actually start or continue.
export default function SessionPreviewCard({ session, onNavigate }) {
  return (
    <div className="dash-card">
      <CardHead
        icon="⏱️"
        title="Study session"
        sub={session.running ? `In progress — ${session.subject}` : "Ready when you are"}
      />
      <div className="session-preview-main">
        <div className={"timer-ring-mini" + (session.running ? " live" : "")}>
          <div>
            <b>{session.running ? "LIVE" : "00:00:00"}</b>
            <small>{session.running ? "SESSION IN PROGRESS" : "READY TO FOCUS"}</small>
          </div>
        </div>
        <div className="session-preview-actions">
          <button className="btn btn-primary full" type="button" onClick={() => onNavigate("study")}>
            {session.running ? "▶ Continue session" : "▶ Start session"}
          </button>
          <button className="text-link" type="button" onClick={() => onNavigate("study")}>
            Open study room →
          </button>
        </div>
      </div>
    </div>
  );
}
