import "./Overview.css";

export default function QuickActionsCard({ onNavigate }) {
  return (
    <div className="dash-card">
      <h2 className="heading-font">Quick Actions</h2>
      <div className="quick-actions">
        <button className="quick-action-btn primary" type="button" onClick={() => onNavigate("study")}>
          <span className="qa-left">▶️ Start Study Session</span>
          <span>›</span>
        </button>
        <button className="quick-action-btn secondary" type="button" onClick={() => onNavigate("nutrition")}>
          <span className="qa-left">🍎 Log My Food</span>
          <span>›</span>
        </button>
      </div>
    </div>
  );
}
