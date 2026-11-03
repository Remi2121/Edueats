// Preview-only mood data. Real app replaces this with the CNN's prediction
// (ml/predict.py) and the rule engine's food list (ml/rule_engine.py).
export const MOODS = [
  { name: "Happy", emoji: "🙂", bg: "var(--mood-happy-bg)", ink: "var(--mood-happy-ink)",
    snacks: ["Apple slices", "Plain yogurt", "Carrot sticks"], valence: 6, concerning: false },
  { name: "Sad", emoji: "😔", bg: "var(--mood-sad-bg)", ink: "var(--mood-sad-ink)",
    snacks: ["Almonds", "Banana", "Oats"], valence: -4, concerning: true },
  { name: "Angry", emoji: "😠", bg: "var(--mood-angry-bg)", ink: "var(--mood-angry-ink)",
    snacks: ["Whole wheat crackers", "Cheese cubes", "Orange"], valence: -5, concerning: true },
  { name: "Fear", emoji: "😨", bg: "var(--mood-fear-bg)", ink: "var(--mood-fear-ink)",
    snacks: ["Almonds", "Spinach salad", "Milk"], valence: -4, concerning: true },
  { name: "Disgust", emoji: "🤢", bg: "var(--mood-disgust-bg)", ink: "var(--mood-disgust-ink)",
    snacks: ["Plain crackers", "Boiled egg", "Watermelon"], valence: -3, concerning: true },
  { name: "Neutral", emoji: "😐", bg: "var(--mood-neutral-bg)", ink: "var(--mood-neutral-ink)",
    snacks: ["Mixed nuts", "Whole grain toast", "Orange"], valence: 1, concerning: false },
  { name: "Surprise", emoji: "😮", bg: "var(--mood-surprise-bg)", ink: "var(--mood-surprise-ink)",
    snacks: ["Granola bar", "Grapes", "Cheese cubes"], valence: 3, concerning: false },
];

export function initials(name) {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function timeNow() {
  const now = new Date();
  const h = now.getHours() % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  return `${h}:${m} ${ampm}`;
}

// Formats a MySQL timestamp (e.g. a moods.detected_at or alerts.sent_at
// value) into the same "Mon 9:05 AM" style used elsewhere in this UI.
export function formatHistoryTimestamp(isoString) {
  const d = new Date(isoString);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${weekday} ${time}`;
}
