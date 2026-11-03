import { useState } from "react";
import { initials } from "../../../data/moods";
import "./SettingsPanel.css";

function Switch({ on, onClick, label }) {
  return (
    <button
      className={"switch" + (on ? " on" : "")}
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
    >
      <span className="switch-knob" />
    </button>
  );
}

// Webcam permission and notification toggles are local display state only —
// the browser (not this app) actually owns camera permission, and real
// push-notification delivery isn't built yet (planned future work).
// Appearance and Log Out are the two real, wired actions here.
export default function SettingsPanel({ student, theme, onToggleTheme, onLogout }) {
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  return (
    <div className="dash-card" style={{ gridColumn: "1 / -1" }}>
      <h2 className="heading-font">Settings</h2>

      <div className="settings-list">
        <div className="settings-row">
          <div className="settings-row-left">
            <div className="settings-avatar">
              {student.photoDataUrl ? <img src={student.photoDataUrl} alt="" /> : initials(student.name)}
            </div>
            <div>
              <div className="settings-row-label">{student.name}</div>
              <div className="settings-row-hint">{student.classLine}</div>
            </div>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-left">
            <span className="settings-row-icon">📷</span>
            <div>
              <div className="settings-row-label">Webcam Permission</div>
              <div className="settings-row-hint">Your browser controls the real permission — this just reflects it here.</div>
            </div>
          </div>
          <Switch on={webcamEnabled} onClick={() => setWebcamEnabled((v) => !v)} label="Toggle webcam permission display" />
        </div>

        <div className="settings-row">
          <div className="settings-row-left">
            <span className="settings-row-icon">🔔</span>
            <div>
              <div className="settings-row-label">Notifications & Reminders</div>
              <div className="settings-row-hint">Parent push notifications are coming in a future update.</div>
            </div>
          </div>
          <Switch on={remindersEnabled} onClick={() => setRemindersEnabled((v) => !v)} label="Toggle notifications and reminders" />
        </div>

        <button className="settings-row settings-row-button" type="button" onClick={onToggleTheme}>
          <div className="settings-row-left">
            <span className="settings-row-icon">{theme === "dark" ? "🌙" : "☀️"}</span>
            <div>
              <div className="settings-row-label">Theme</div>
              <div className="settings-row-hint">Currently {theme === "dark" ? "Dark" : "Light"} mode — tap to switch</div>
            </div>
          </div>
          <span className="settings-row-chevron">›</span>
        </button>

        <button className="settings-row settings-row-button settings-row-danger" type="button" onClick={onLogout}>
          <div className="settings-row-left">
            <span className="settings-row-icon">🚪</span>
            <div className="settings-row-label">Log Out</div>
          </div>
        </button>
      </div>
    </div>
  );
}
