import { useEffect, useState } from "react";
import { initials } from "../../../data/moods";
import { NOTIFICATIONS_ENABLED_KEY, WEBCAM_DISABLED_KEY, isWebcamDisabledByUser } from "../../../data/preferences";
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

// Webcam Permission reflects the browser's REAL camera permission (read via
// the Permissions API) combined with whether the student asked the app to
// stop using the camera — turning it off here really stops ClassSessionCard
// from opening the camera next session; turning it on really triggers the
// browser's real permission prompt if it hasn't been granted yet. JS can't
// revoke a browser permission directly, only the student's own browser
// settings can — this is disclosed in the hint text below.
//
// Notifications & Reminders is wired to the browser's real Notification
// API — turning it on really asks for notification permission and, once
// granted, real alerts fired from Dashboard.jsx show up as real OS
// notifications. This is a real LOCAL notification on this device, not the
// Firebase-to-parent's-phone push pipeline (still a disclosed, separate gap).
export default function SettingsPanel({ student, theme, onToggleTheme, onLogout }) {
  const [webcamEnabled, setWebcamEnabled] = useState(!isWebcamDisabledByUser());
  const [webcamHint, setWebcamHint] = useState(
    "Your browser controls the real permission — this just reflects it here."
  );
  const [remindersEnabled, setRemindersEnabled] = useState(
    localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "true" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
  );
  const [remindersHint, setRemindersHint] = useState("Parent push notifications are coming in a future update.");

  // Keeps the toggle honest if the student changes the real permission in
  // their browser's own site settings while this page is open.
  useEffect(() => {
    if (!navigator.permissions?.query) return;
    let status;
    navigator.permissions.query({ name: "camera" }).then((result) => {
      status = result;
      if (result.state !== "granted") setWebcamEnabled(false);
      result.onchange = () => {
        if (result.state !== "granted") setWebcamEnabled(false);
      };
    }).catch(() => {});
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  async function handleWebcamToggle() {
    if (webcamEnabled) {
      // Can't revoke the browser's real permission from JS — but we CAN
      // really stop the app from opening the camera next session.
      localStorage.setItem(WEBCAM_DISABLED_KEY, "true");
      setWebcamEnabled(false);
      setWebcamHint("Webcam check-ins are off. Your next study session won't open the camera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop()); // only needed this to trigger/confirm the real permission
      localStorage.removeItem(WEBCAM_DISABLED_KEY);
      setWebcamEnabled(true);
      setWebcamHint("Your browser controls the real permission — this just reflects it here.");
    } catch {
      setWebcamHint("Camera permission was denied — allow it in your browser's site settings to turn this on.");
    }
  }

  async function handleRemindersToggle() {
    if (remindersEnabled) {
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
      setRemindersEnabled(false);
      setRemindersHint("Real alert notifications are off.");
      return;
    }
    if (typeof Notification === "undefined") {
      setRemindersHint("This browser doesn't support notifications.");
      return;
    }
    if (Notification.permission === "denied") {
      setRemindersHint("Notifications were blocked — allow them in your browser's site settings to turn this on.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true");
      setRemindersEnabled(true);
      setRemindersHint("On — a real mood or posture alert will show a real notification on this device.");
      new Notification("EduEats notifications are on", { body: "You'll see real alerts here from now on." });
    } else {
      setRemindersHint("Notification permission wasn't granted.");
    }
  }

  return (
    <div className="dash-card" style={{ gridColumn: "1 / -1" }}>
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
              <div className="settings-row-hint">{webcamHint}</div>
            </div>
          </div>
          <Switch on={webcamEnabled} onClick={handleWebcamToggle} label="Toggle webcam permission" />
        </div>

        <div className="settings-row">
          <div className="settings-row-left">
            <span className="settings-row-icon">🔔</span>
            <div>
              <div className="settings-row-label">Notifications & Reminders</div>
              <div className="settings-row-hint">{remindersHint}</div>
            </div>
          </div>
          <Switch on={remindersEnabled} onClick={handleRemindersToggle} label="Toggle notifications and reminders" />
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
