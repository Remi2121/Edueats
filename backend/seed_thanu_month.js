// One-off seed script: 1 month of realistic activity data for student id 6 (thanu).
// Run once, then delete — same pattern as earlier one-off migration scripts.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("./db");

const STUDENT_ID = 6;
const DAYS_BACK = 30;
const SUBJECTS = ["Mathematics", "Science", "English", "History", "ICT"];
const MOODS = ["happy", "sad", "angry", "fear", "disgust", "neutral", "surprise"];
const CONCERNING = new Set(["sad", "angry", "fear", "disgust"]);

// Same real nutrition CSV + mood rules the backend itself uses, so seeded
// food_recommendations are genuinely rule-consistent, not random.
const NUTRITION_CSV_PATH = path.join(__dirname, "..", "data", "nutrition_dataset.csv");
const foodNutrients = {};
fs.readFileSync(NUTRITION_CSV_PATH, "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .forEach((line) => {
    const cells = line.match(/(".*?"|[^,]+)(?=,|$)/g).map((c) => c.replace(/^"|"$/g, ""));
    const [food_name, calories, fat_g, sugar_g, water_ml, magnesium_mg, vitamin_b_mg] = cells;
    foodNutrients[food_name] = {
      food_name,
      calories: Number(calories), fat_g: Number(fat_g), sugar_g: Number(sugar_g),
      water_ml: Number(water_ml), magnesium_mg: Number(magnesium_mg), vitamin_b_mg: Number(vitamin_b_mg),
    };
  });
const NUTRIENT_KEYS = ["calories", "fat_g", "sugar_g", "water_ml", "magnesium_mg", "vitamin_b_mg"];
const MOOD_RULES = {
  sad: ["high_magnesium_mg", "high_vitamin_b_mg"], angry: ["low_sugar_g", "high_calories"],
  fear: ["high_magnesium_mg"], happy: ["high_water_ml", "low_fat_g"],
  disgust: ["low_fat_g", "low_calories"], neutral: [], surprise: [],
};
const medians = {};
NUTRIENT_KEYS.forEach((key) => {
  const values = Object.values(foodNutrients).map((f) => f[key]).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  medians[key] = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
});
function matchedFoods(mood) {
  const rules = MOOD_RULES[mood];
  return Object.values(foodNutrients).filter((f) =>
    rules.every((rule) => {
      const [dir, key] = rule.split(/_(.+)/);
      return dir === "high" ? f[key] >= medians[key] : f[key] <= medians[key];
    })
  ).map((f) => f.food_name);
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function sample(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  return out;
}
function fmt(date) { return date.toISOString().slice(0, 19).replace("T", " "); }

async function seed() {
  let sessions = 0, moods = 0, foods = 0, alerts = 0, postureChecks = 0, postureAlerts = 0, foodLogs = 0;
  const today = new Date();

  for (let d = DAYS_BACK - 1; d >= 0; d--) {
    const day = new Date(today);
    day.setDate(day.getDate() - d);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue; // weekdays only, matches school pattern

    const sessionsToday = randInt(1, 2);
    for (let s = 0; s < sessionsToday; s++) {
      const subject = pick(SUBJECTS);
      const durationMin = pick([30, 45, 60, 90]);
      const startHour = randInt(8, 15);
      const startedAt = new Date(day);
      startedAt.setHours(startHour, randInt(0, 59), 0, 0);
      const endedAt = new Date(startedAt.getTime() + durationMin * 60000);

      const [sessionResult] = await pool.query(
        "INSERT INTO sessions (student_id, subject, duration_min, started_at, ended_at) VALUES (?, ?, ?, ?, ?)",
        [STUDENT_ID, subject, durationMin, fmt(startedAt), fmt(endedAt)]
      );
      const sessionId = sessionResult.insertId;
      sessions++;

      // 1-3 real mood check-ins spread across the session, same real cadence idea as the 15-min interval
      const checkinCount = Math.max(1, Math.min(3, Math.floor(durationMin / 20)));
      for (let c = 0; c < checkinCount; c++) {
        const mood = pick(MOODS);
        const detectedAt = new Date(startedAt.getTime() + ((c + 1) * durationMin * 60000) / (checkinCount + 1));

        const [moodResult] = await pool.query(
          "INSERT INTO moods (student_id, session_id, mood, detected_at) VALUES (?, ?, ?, ?)",
          [STUDENT_ID, sessionId, mood, fmt(detectedAt)]
        );
        const moodId = moodResult.insertId;
        moods++;

        const matches = matchedFoods(mood);
        const chosen = matches.length ? sample(matches, Math.min(5, matches.length)) : [];
        for (const foodName of chosen) {
          await pool.query("INSERT INTO food_recommendations (mood_id, food_name) VALUES (?, ?)", [moodId, foodName]);
          foods++;
        }

        if (CONCERNING.has(mood) && Math.random() < 0.6) {
          await pool.query("INSERT INTO alerts (mood_id, sent_at) VALUES (?, ?)", [moodId, fmt(detectedAt)]);
          alerts++;
        }
      }

      // 1-2 real posture checks per session
      const postureCount = randInt(1, 2);
      let lastPostureId = null, poorStreak = 0;
      for (let p = 0; p < postureCount; p++) {
        const status = Math.random() < 0.3 ? "poor" : "good";
        const checkedAt = new Date(startedAt.getTime() + ((p + 1) * durationMin * 60000) / (postureCount + 1));
        const [postureResult] = await pool.query(
          "INSERT INTO posture_checks (student_id, session_id, status, checked_at) VALUES (?, ?, ?, ?)",
          [STUDENT_ID, sessionId, status, fmt(checkedAt)]
        );
        lastPostureId = postureResult.insertId;
        postureChecks++;
        poorStreak = status === "poor" ? poorStreak + 1 : 0;
        if (poorStreak >= 2) {
          await pool.query("INSERT INTO posture_alerts (posture_check_id, sent_at) VALUES (?, ?)", [lastPostureId, fmt(checkedAt)]);
          postureAlerts++;
          poorStreak = 0;
        }
      }
    }

    // 1-2 real logged foods per day, independent of sessions (the "My Food Log" feature)
    const logsToday = randInt(1, 2);
    const allFoodNames = Object.keys(foodNutrients);
    for (let l = 0; l < logsToday; l++) {
      const loggedAt = new Date(day);
      loggedAt.setHours(randInt(7, 20), randInt(0, 59), 0, 0);
      await pool.query(
        "INSERT INTO food_log (student_id, food_name, logged_at) VALUES (?, ?, ?)",
        [STUDENT_ID, pick(allFoodNames), fmt(loggedAt)]
      );
      foodLogs++;
    }
  }

  console.log({ sessions, moods, food_recommendations: foods, alerts, posture_checks: postureChecks, posture_alerts: postureAlerts, food_log: foodLogs });
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
