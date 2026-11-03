// Real local preferences the Settings page's two toggles actually control —
// stored per-browser (same localStorage pattern App.jsx uses for the signed-in
// session), read by the features they affect (the webcam capture in
// ClassSessionCard, and the real alert notifications fired from Dashboard).
export const WEBCAM_DISABLED_KEY = "edueats_webcam_disabled";
export const NOTIFICATIONS_ENABLED_KEY = "edueats_notifications_enabled";

// The browser (not this app) owns the real camera permission — this only
// tracks whether the STUDENT asked the app to stop using the camera after
// granting it, since JavaScript can't revoke a browser permission itself.
export function isWebcamDisabledByUser() {
  return localStorage.getItem(WEBCAM_DISABLED_KEY) === "true";
}

// A real alert notification only fires if the student turned this on AND
// the browser's own Notification permission is actually granted — both
// have to be true, not just the app's own toggle.
export function areNotificationsEnabled() {
  return (
    localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "true" &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  );
}

// Fires a real browser notification for a real alert (mood or posture) —
// a no-op whenever the toggle is off or permission isn't granted, so this
// is always safe to call from anywhere an alert is created.
export function notify(title, body) {
  if (!areNotificationsEnabled()) return;
  try {
    new Notification(title, { body });
  } catch {
    // some browsers/contexts can still refuse to show one even when
    // permission is "granted" — never let that break a check-in
  }
}
