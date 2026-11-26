// Real backend calls - no Firebase, no mock data. Talks to the same
// Express/MySQL backend the student web app uses (EduEats/backend/server.js),
// over the LAN so a physical/emulated device can reach the dev machine.
//
// This IP must match whatever address `npx expo start` prints as "Metro:
// exp://<ip>:8081" - update it here if the machine's LAN IP changes (e.g.
// after reconnecting Wi-Fi). The backend's CORS is already wide open, so
// no server-side change is needed when this IP changes.
const API_BASE = "http://192.168.1.120:3000";

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export const api = {
  parentLogin: (email, password) =>
    request("/api/parent/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  parentSignup: (email, password, student_email) =>
    request("/api/parent/signup", { method: "POST", body: JSON.stringify({ email, password, student_email }) }),

  getChild: (parentId) => request(`/api/parent/${parentId}/child`),

  getAlerts: (parentId) => request(`/api/parent/${parentId}/alerts`),

  markAlertRead: (alertId, type) => request(`/api/parent/alerts/${alertId}/read?type=${type}`, { method: "PATCH" }),

  getRestrictions: (studentId) => request(`/api/students/${studentId}/restrictions`),

  setRestrictions: (studentId, food_names) =>
    request(`/api/students/${studentId}/restrictions`, { method: "PUT", body: JSON.stringify({ food_names }) }),

  getFoodCatalog: () => request("/api/foods/full"),

  getLatestMood: (studentId) => request(`/api/students/${studentId}/moods`),

  getLatestNutrition: (studentId) => request(`/api/students/${studentId}/nutrition`),

  getFocus: (studentId) => request(`/api/students/${studentId}/focus`),

  getWeekMinutes: (studentId, range) => request(`/api/students/${studentId}/sessions/week${range ? `?range=${range}` : ""}`),
};
