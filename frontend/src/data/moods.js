// Preview-only mood data. Real app replaces this with the CNN's prediction
// (ml/predict.py) and the rule engine's food list (ml/rule_engine.py). The
// snack names here are spelled to match the real nutrition dataset's food
// names exactly (see data/nutrition_dataset.csv) so even this preview state
// shows a real food photo instead of a fallback icon.
export const MOODS = [
  { name: "Happy", emoji: "🙂", bg: "var(--mood-happy-bg)", ink: "var(--mood-happy-ink)",
    snacks: ["Apple", "Plain yogurt", "Carrot"], valence: 6, concerning: false },
  { name: "Sad", emoji: "😔", bg: "var(--mood-sad-bg)", ink: "var(--mood-sad-ink)",
    snacks: ["Almonds", "Banana", "Oats"], valence: -4, concerning: true },
  { name: "Angry", emoji: "😠", bg: "var(--mood-angry-bg)", ink: "var(--mood-angry-ink)",
    snacks: ["Whole wheat bread", "Cheddar cheese", "Orange"], valence: -5, concerning: true },
  { name: "Fear", emoji: "😨", bg: "var(--mood-fear-bg)", ink: "var(--mood-fear-ink)",
    snacks: ["Almonds", "Spinach", "Whole milk"], valence: -4, concerning: true },
  { name: "Disgust", emoji: "🤢", bg: "var(--mood-disgust-bg)", ink: "var(--mood-disgust-ink)",
    snacks: ["Popcorn", "Egg, boiled", "Watermelon"], valence: -3, concerning: true },
  { name: "Neutral", emoji: "😐", bg: "var(--mood-neutral-bg)", ink: "var(--mood-neutral-ink)",
    snacks: ["Almonds", "Whole wheat bread", "Orange"], valence: 1, concerning: false },
  { name: "Surprise", emoji: "😮", bg: "var(--mood-surprise-bg)", ink: "var(--mood-surprise-ink)",
    snacks: ["Oats", "Grapes", "Cheddar cheese"], valence: 3, concerning: false },
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
