require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { OAuth2Client } = require("google-auth-library");
const pool = require("./db");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();
app.use(cors());
app.use(express.json());

// uploaded check-in photos land here temporarily, then get deleted after the CNN reads them
const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({ dest: UPLOAD_DIR });

// profile photos are kept permanently (unlike check-in photos above) and
// served back out over HTTP so the frontend can display them
const PHOTO_DIR = path.join(__dirname, "photos");
fs.mkdirSync(PHOTO_DIR, { recursive: true });
const photoUpload = multer({
  storage: multer.diskStorage({
    destination: PHOTO_DIR,
    filename: (req, file, cb) => cb(null, `${req.params.id}-${Date.now()}${path.extname(file.originalname)}`),
  }),
});
app.use("/photos", express.static(PHOTO_DIR));

// the ml/ scripts use paths like "data/..." and "ml/..." relative to the EduEats/ repo root,
// so the Python process must be run with that folder as its working directory
const ML_ROOT = path.join(__dirname, "..");

// moods the rule engine treats as needing a parent alert — mirrors the
// `concerning` flags in frontend/src/data/moods.js
const CONCERNING_MOODS = new Set(["sad", "angry", "fear", "disgust"]);

// Every real check-in writes its own log file, one folder per student, so
// the full frontend -> backend -> ML -> database -> frontend pipeline for
// any single check-in can be read back afterward from disk instead of being
// shown live in the UI.
const LOGS_DIR = path.join(__dirname, "logs");

function startCheckinLog(studentId) {
  const studentDir = path.join(LOGS_DIR, `student_${studentId}`);
  fs.mkdirSync(studentDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(studentDir, `checkin_${stamp}.log`);
  const logStep = (message) => {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(logFile, line);
  };
  return { logFile, logStep };
}

// Loads the real per-food nutrient values (same CSV the rule engine reads)
// once at startup, keyed by food name, so the frontend's nutrition detail
// view can show real numbers instead of inventing any.
const NUTRITION_CSV_PATH = path.join(ML_ROOT, "data", "nutrition_dataset.csv");
const foodNutrients = {};
fs.readFileSync(NUTRITION_CSV_PATH, "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .forEach((line) => {
    // food names can contain a comma inside quotes, e.g. "Barley, cooked"
    const cells = line.match(/(".*?"|[^,]+)(?=,|$)/g).map((c) => c.replace(/^"|"$/g, ""));
    const [food_name, calories, fat_g, sugar_g, water_ml, magnesium_mg, vitamin_b_mg,
      tamil_name, sinhala_name, price_lkr] = cells;
    foodNutrients[food_name] = {
      food_name,
      calories: Number(calories),
      fat_g: Number(fat_g),
      sugar_g: Number(sugar_g),
      water_ml: Number(water_ml),
      magnesium_mg: Number(magnesium_mg),
      vitamin_b_mg: Number(vitamin_b_mg),
      tamil_name,
      sinhala_name,
      price_lkr: Number(price_lkr),
    };
  });

// Same real mood -> nutrient rule table as ml/rule_engine.py (kept in sync
// by hand — see that file for the citations behind each direction). Used
// here only to explain WHY a food matches a mood, not to recompute the
// recommendation itself (that's still the Python rule engine's job).
const NUTRIENT_KEYS = ["calories", "fat_g", "sugar_g", "water_ml", "magnesium_mg", "vitamin_b_mg"];
const MOOD_RULES = {
  sad: ["high_magnesium_mg", "high_vitamin_b_mg"],
  angry: ["low_sugar_g", "high_calories"],
  fear: ["high_magnesium_mg"],
  happy: ["high_water_ml", "low_fat_g"],
  disgust: ["low_fat_g", "low_calories"],
  neutral: [],
  surprise: [],
};

// Same median-per-nutrient calculation as rule_engine.py's compute_medians()
// — what "high"/"low" actually means in MOOD_RULES above.
const foodMedians = {};
NUTRIENT_KEYS.forEach((key) => {
  const values = Object.values(foodNutrients).map((f) => f[key]).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  foodMedians[key] = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
});

// creates a new student account; password is hashed, never stored plain
app.post("/api/signup", async (req, res) => {
  const { name, email, password, grade, room_no } = req.body;
  const password_hash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.query(
      "INSERT INTO students (name, email, password_hash, grade, room_no) VALUES (?, ?, ?, ?, ?)",
      [name, email, password_hash, grade, room_no]
    );
    res.json({ id: result.insertId, name, email, grade, room_no });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "An account with this email already exists" });
    } else {
      throw err;
    }
  }
});

// checks email + password against the stored hash and logs the student in
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, password_hash, grade, room_no, photo_path FROM students WHERE email = ?",
      [email]
    );
    const student = rows[0];
    // Google-only accounts have no password_hash at all — they must sign in
    // with the Google button, not this form.
    const passwordMatches =
      student && student.password_hash && (await bcrypt.compare(password, student.password_hash));
    if (!passwordMatches) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }
    const { password_hash, ...studentInfo } = student;
    res.json(studentInfo);
  } catch (err) {
    console.error("Login DB error:", err.code || err.message);
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({ error: "MySQL service is stopped. Please start MySQL95 in Windows Services." });
    }
    res.status(500).json({ error: "Database error: " + (err.message || "Unknown error") });
  }
});

// verifies a real Google ID token, then finds or creates the matching student
app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body;
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Invalid Google sign-in." });
  }

  try {
    const [existing] = await pool.query(
      "SELECT id, name, email, grade, room_no, photo_path FROM students WHERE email = ?",
      [payload.email]
    );
    if (existing[0]) {
      return res.json(existing[0]);
    }

    const [result] = await pool.query(
      "INSERT INTO students (name, email) VALUES (?, ?)",
      [payload.name, payload.email]
    );
    res.json({ id: result.insertId, name: payload.name, email: payload.email, grade: null, room_no: null });
  } catch (err) {
    console.error("Google Auth DB error:", err.code || err.message);
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({ error: "MySQL service is stopped. Please start MySQL95 in Windows Services." });
    }
    res.status(500).json({ error: "Database error: " + (err.message || "Unknown error") });
  }
});

// creates a parent account, linked to one existing student by that
// student's email (the parent must already know which student account they
// follow - there's no open signup that lets a parent attach to any student)
app.post("/api/parent/signup", async (req, res) => {
  const { email, password, student_email } = req.body;
  const [studentRows] = await pool.query("SELECT id FROM students WHERE email = ?", [student_email]);
  if (!studentRows[0]) {
    return res.status(404).json({ error: "No student account found with that email" });
  }
  const password_hash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.query(
      "INSERT INTO parents (email, password_hash, student_id) VALUES (?, ?, ?)",
      [email, password_hash, studentRows[0].id]
    );
    res.json({ id: result.insertId, email, student_id: studentRows[0].id });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "A parent account with this email already exists" });
    } else {
      throw err;
    }
  }
});

// checks a parent's email + password against the stored hash
app.post("/api/parent/login", async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.query(
    "SELECT id, email, password_hash, student_id FROM parents WHERE email = ?",
    [email]
  );
  const parent = rows[0];
  const passwordMatches = parent && (await bcrypt.compare(password, parent.password_hash));
  if (!passwordMatches) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }
  const { password_hash, ...parentInfo } = parent;
  res.json(parentInfo);
});

// the student a parent account is linked to, for the parent app's dashboard header
app.get("/api/parent/:id/child", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.grade, s.room_no, s.photo_path
     FROM parents p JOIN students s ON p.student_id = s.id
     WHERE p.id = ?`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Parent account not found" });
  res.json(rows[0]);
});

// real mood alerts + real posture alerts for a parent's linked student,
// merged into one list newest-first - this is the parent app's only alert
// delivery mechanism (in-app), there is no SMS or push notification
app.get("/api/parent/:id/alerts", async (req, res) => {
  const [parentRows] = await pool.query("SELECT student_id FROM parents WHERE id = ?", [req.params.id]);
  if (!parentRows[0]) return res.status(404).json({ error: "Parent account not found" });
  const student_id = parentRows[0].student_id;

  const [moodAlerts] = await pool.query(
    `SELECT a.id, 'mood' AS type, a.sent_at, (a.read_at IS NOT NULL) AS is_read, m.mood, s.subject
     FROM alerts a
     JOIN moods m ON a.mood_id = m.id
     LEFT JOIN sessions s ON m.session_id = s.id
     WHERE m.student_id = ?`,
    [student_id]
  );
  const [postureAlerts] = await pool.query(
    `SELECT pa.id, 'posture' AS type, pa.sent_at, (pa.read_at IS NOT NULL) AS is_read, s.subject
     FROM posture_alerts pa
     JOIN posture_checks pc ON pa.posture_check_id = pc.id
     LEFT JOIN sessions s ON pc.session_id = s.id
     WHERE pc.student_id = ?`,
    [student_id]
  );
  const merged = [...moodAlerts, ...postureAlerts].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  res.json(merged);
});

// marks one parent alert as read - ?type=mood (default) or ?type=posture,
// since mood alerts and posture alerts live in two different tables
app.patch("/api/parent/alerts/:id/read", async (req, res) => {
  const table = req.query.type === "posture" ? "posture_alerts" : "alerts";
  await pool.query(`UPDATE ${table} SET read_at = NOW() WHERE id = ?`, [req.params.id]);
  res.json({ id: Number(req.params.id), read: true });
});

// fills in grade/room for a student created via Google sign-in (profile step)
app.patch("/api/students/:id", async (req, res) => {
  const { grade, room_no } = req.body;
  await pool.query("UPDATE students SET grade = ?, room_no = ? WHERE id = ?", [grade, room_no, req.params.id]);
  res.json({ id: Number(req.params.id), grade, room_no });
});

// saves a student's real profile photo and records where it's stored
app.post("/api/students/:id/photo", photoUpload.single("photo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No photo uploaded" });
  }
  const photo_path = `/photos/${req.file.filename}`;
  await pool.query("UPDATE students SET photo_path = ? WHERE id = ?", [photo_path, req.params.id]);
  res.json({ photo_path });
});

// returns a student's real mood history from MySQL, newest first
app.get("/api/students/:id/moods", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT m.id, m.mood, m.detected_at, s.subject
     FROM moods m LEFT JOIN sessions s ON m.session_id = s.id
     WHERE m.student_id = ? ORDER BY m.detected_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

// returns the food recommendations from a student's most recent check-in
app.get("/api/students/:id/nutrition", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT fr.food_name FROM food_recommendations fr
     WHERE fr.mood_id = (
       SELECT id FROM moods WHERE student_id = ? ORDER BY detected_at DESC LIMIT 1
     )`,
    [req.params.id]
  );
  res.json(rows.map((r) => r.food_name));
});

// the real mood -> nutrient rule table + the real per-nutrient medians it's
// evaluated against — lets the frontend explain WHY a food matched a mood,
// using the exact same real numbers the rule engine itself was built on
app.get("/api/mood-rules", (req, res) => {
  res.json({ rules: MOOD_RULES, medians: foodMedians });
});

// a student's real check-in history (not just the latest one) — each past
// check-in's real mood and the real foods the rule engine matched for it,
// newest first, so the frontend can show "most recent, then before that..."
app.get("/api/students/:id/nutrition-history", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const [moods] = await pool.query(
    `SELECT m.id, m.mood, m.detected_at, s.subject
     FROM moods m LEFT JOIN sessions s ON m.session_id = s.id
     WHERE m.student_id = ? ORDER BY m.detected_at DESC LIMIT ?`,
    [req.params.id, limit]
  );
  if (moods.length === 0) return res.json([]);

  const [foodRows] = await pool.query(
    "SELECT mood_id, food_name FROM food_recommendations WHERE mood_id IN (?)",
    [moods.map((m) => m.id)]
  );
  const foodsByMood = {};
  foodRows.forEach((r) => {
    (foodsByMood[r.mood_id] = foodsByMood[r.mood_id] || []).push(r.food_name);
  });

  res.json(
    moods.map((m) => ({
      mood_id: m.id,
      mood: m.mood,
      detected_at: m.detected_at,
      subject: m.subject,
      foods: foodsByMood[m.id] || [],
    }))
  );
});

// real mood (by majority, same rule as the live check-in batching) + its
// real matched foods, one entry per real calendar week over the last
// `weeks` weeks (default 5) — week 1 is the most recent 7-day window,
// week 5 the oldest
// formats a Date as YYYY-MM-DD using its LOCAL date, not toISOString's UTC
// conversion — toISOString shifts the date backward whenever the server's
// local timezone is ahead of UTC (e.g. midnight IST on the 3rd is still the
// 2nd in UTC), which silently mislabels "today" as "yesterday"
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

app.get("/api/students/:id/mood-weeks", async (req, res) => {
  const weeksCount = Math.min(parseInt(req.query.weeks, 10) || 5, 12);
  const days = weeksCount * 7;
  const [rows] = await pool.query(
    `SELECT id, mood, detected_at FROM moods
     WHERE student_id = ? AND detected_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ORDER BY detected_at ASC`,
    [req.params.id, days]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekBuckets = Array.from({ length: weeksCount }, () => ({ counts: {}, firstIdByMood: {} }));
  for (const row of rows) {
    const detected = new Date(row.detected_at);
    const detectedDay = new Date(detected.getFullYear(), detected.getMonth(), detected.getDate());
    const diffDays = Math.floor((today - detectedDay) / (24 * 60 * 60 * 1000));
    const weekIndex = Math.floor(diffDays / 7);
    if (weekIndex < 0 || weekIndex >= weeksCount) continue;
    const bucket = weekBuckets[weekIndex];
    bucket.counts[row.mood] = (bucket.counts[row.mood] || 0) + 1;
    if (!(row.mood in bucket.firstIdByMood)) bucket.firstIdByMood[row.mood] = row.id;
  }

  const weekEntries = weekBuckets.map((bucket, i) => {
    let winningMood = null;
    let winningCount = 0;
    for (const [mood, count] of Object.entries(bucket.counts)) {
      if (count > winningCount) {
        winningCount = count;
        winningMood = mood;
      }
    }
    const end = new Date(today);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return {
      week: i + 1,
      start: localDateStr(start),
      end: localDateStr(end),
      mood: winningMood,
      mood_id: winningMood ? bucket.firstIdByMood[winningMood] : null,
    };
  });

  const moodIds = weekEntries.map((w) => w.mood_id).filter(Boolean);
  const foodsByMood = {};
  if (moodIds.length) {
    const [foodRows] = await pool.query(
      "SELECT mood_id, food_name FROM food_recommendations WHERE mood_id IN (?)",
      [moodIds]
    );
    foodRows.forEach((r) => {
      (foodsByMood[r.mood_id] = foodsByMood[r.mood_id] || []).push(r.food_name);
    });
  }

  res.json(
    weekEntries.map((w) => ({
      week: w.week,
      start: w.start,
      end: w.end,
      mood: w.mood,
      foods: w.mood_id ? foodsByMood[w.mood_id] || [] : [],
    }))
  );
});

// returns a student's real parent-alert history from MySQL, newest first —
// including the real foods recommended at that same check-in, so the
// parent sees what was suggested, not just the mood that triggered it
app.get("/api/students/:id/alerts", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.id, a.mood_id, a.sent_at, m.mood, s.subject
     FROM alerts a
     JOIN moods m ON a.mood_id = m.id
     LEFT JOIN sessions s ON m.session_id = s.id
     WHERE m.student_id = ?
     ORDER BY a.sent_at DESC`,
    [req.params.id]
  );
  if (rows.length === 0) return res.json([]);

  const [foodRows] = await pool.query(
    "SELECT mood_id, food_name FROM food_recommendations WHERE mood_id IN (?)",
    [rows.map((r) => r.mood_id)]
  );
  const foodsByMood = {};
  foodRows.forEach((r) => {
    (foodsByMood[r.mood_id] = foodsByMood[r.mood_id] || []).push(r.food_name);
  });

  res.json(rows.map((r) => ({ ...r, foods: foodsByMood[r.mood_id] || [] })));
});

// records one raw posture check (detected client-side by MediaPipe Pose,
// sampled every 15 real minutes same as mood). This does NOT alert by
// itself — the frontend collects 3 of these (45 minutes) and only calls
// /api/posture/alert if most of that batch was poor, so a single bad
// reading doesn't trigger a parent notification on its own.
app.post("/api/posture", async (req, res) => {
  const { student_id, session_id, status } = req.body;
  if (status !== "good" && status !== "poor") {
    return res.status(400).json({ error: "status must be 'good' or 'poor'" });
  }
  const [result] = await pool.query(
    "INSERT INTO posture_checks (student_id, session_id, status) VALUES (?, ?, ?)",
    [student_id, session_id || null, status]
  );
  res.json({ posture_check_id: result.insertId, status });
});

// sends a real parent alert for a posture check the frontend already
// decided (via its 3-reading majority vote) was part of a sustained
// poor-posture batch
app.post("/api/posture/alert", async (req, res) => {
  const { posture_check_id } = req.body;
  await pool.query("INSERT INTO posture_alerts (posture_check_id) VALUES (?)", [posture_check_id]);
  res.json({ ok: true });
});

// returns a student's real posture-alert history from MySQL, newest first
app.get("/api/students/:id/posture-alerts", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT pa.id, pa.sent_at, s.subject
     FROM posture_alerts pa
     JOIN posture_checks pc ON pa.posture_check_id = pc.id
     LEFT JOIN sessions s ON pc.session_id = s.id
     WHERE pc.student_id = ?
     ORDER BY pa.sent_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

// creates a new class session for a student
app.post("/api/sessions", async (req, res) => {
  const { student_id, subject, duration_min } = req.body;
  const [result] = await pool.query(
    "INSERT INTO sessions (student_id, subject, duration_min) VALUES (?, ?, ?)",
    [student_id, subject, duration_min]
  );
  res.json({ id: result.insertId, student_id, subject, duration_min });
});

// marks a session as finished — real elapsed time is computed from this
app.patch("/api/sessions/:id/end", async (req, res) => {
  await pool.query("UPDATE sessions SET ended_at = NOW() WHERE id = ?", [req.params.id]);
  res.json({ id: Number(req.params.id) });
});

// real minutes studied today — sums each session's actual elapsed time
// (started_at to ended_at, or to now if it's still running). An abandoned
// session (tab closed without clicking Stop) never gets an ended_at, so its
// "still running" time is capped at the student's own chosen duration_min
// instead of growing forever every time this runs.
app.get("/api/students/:id/sessions/today", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT subject, LEAST(TIMESTAMPDIFF(MINUTE, started_at, COALESCE(ended_at, NOW())), duration_min) AS minutes
     FROM sessions WHERE student_id = ? AND DATE(started_at) = CURDATE()`,
    [req.params.id]
  );
  const totalMinutes = rows.reduce((sum, r) => sum + r.minutes, 0);
  res.json({ totalMinutes, sessions: rows });
});

// real per-subject focus score — the % of check-ins during that subject's
// sessions that were NOT a concerning mood, computed from actual mood rows
// (not a locally nudged placeholder number)
app.get("/api/students/:id/focus", async (req, res) => {
  const concerning = [...CONCERNING_MOODS];
  const placeholders = concerning.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT s.subject,
            COUNT(*) AS total,
            SUM(CASE WHEN m.mood IN (${placeholders}) THEN 0 ELSE 1 END) AS good
     FROM moods m
     JOIN sessions s ON m.session_id = s.id
     WHERE m.student_id = ?
     GROUP BY s.subject`,
    [...concerning, req.params.id]
  );
  res.json(rows.map((r) => ({ subject: r.subject, score: Math.round((r.good / r.total) * 100) })));
});

// real per-day minutes studied over the last 7 (or 30, with ?range=month)
// days, for the Study Time Trend chart — same real elapsed-time calculation
// (and same abandoned-session cap) as /sessions/today
app.get("/api/students/:id/sessions/week", async (req, res) => {
  const days = req.query.range === "month" ? 29 : 6;
  const [rows] = await pool.query(
    `SELECT DATE(started_at) AS day,
            SUM(LEAST(TIMESTAMPDIFF(MINUTE, started_at, COALESCE(ended_at, NOW())), duration_min)) AS minutes
     FROM sessions
     WHERE student_id = ? AND started_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(started_at)`,
    [req.params.id, days]
  );
  res.json(rows.map((r) => ({ day: r.day, minutes: Number(r.minutes) })));
});

// every real food name the rule engine knows about, for the My Food Log picker
app.get("/api/foods", (req, res) => {
  res.json(Object.keys(foodNutrients));
});

// the full real food catalog (nutrients + tamil_name/sinhala_name/price_lkr),
// fetched once by the frontend instead of per-food, so every food display
// anywhere in the app can use real names/prices instead of a placeholder.
// Must be registered before the "/:name" route below, or Express matches
// "full" as a food name there instead (and 404s before this ever runs).
app.get("/api/foods/full", (req, res) => {
  res.json(Object.values(foodNutrients));
});

// real nutrient values for one food, from the same CSV the rule engine uses
app.get("/api/foods/:name", (req, res) => {
  const food = foodNutrients[req.params.name];
  if (!food) return res.status(404).json({ error: "Unknown food" });
  res.json(food);
});

// foods a parent has restricted for this student - the list the parent app's
// Food Restrictions screen reads and writes
app.get("/api/students/:id/restrictions", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT food_name FROM food_restrictions WHERE student_id = ?",
    [req.params.id]
  );
  res.json(rows.map((r) => r.food_name));
});

// replaces a student's whole restriction list with the one the parent app
// sends (the parent app always sends its full current local list, not a
// single add/remove) - unknown food names are rejected so this table can
// never drift from the real nutrition dataset
app.put("/api/students/:id/restrictions", async (req, res) => {
  const { food_names } = req.body;
  const unknown = food_names.filter((name) => !foodNutrients[name]);
  if (unknown.length) {
    return res.status(400).json({ error: `Unknown food(s): ${unknown.join(", ")}` });
  }
  await pool.query("DELETE FROM food_restrictions WHERE student_id = ?", [req.params.id]);
  for (const food_name of food_names) {
    await pool.query(
      "INSERT INTO food_restrictions (student_id, food_name) VALUES (?, ?)",
      [req.params.id, food_name]
    );
  }
  res.json({ student_id: Number(req.params.id), food_names });
});

// logs one food a student actually ate (separate from food_recommendations,
// which is what the rule engine suggested — this is what they really logged)
app.post("/api/students/:id/food-log", async (req, res) => {
  const { food_name } = req.body;
  if (!foodNutrients[food_name]) {
    return res.status(400).json({ error: "Unknown food" });
  }
  const [result] = await pool.query(
    "INSERT INTO food_log (student_id, food_name) VALUES (?, ?)",
    [req.params.id, food_name]
  );
  res.json({ id: result.insertId, food_name });
});

// a student's real logged-food history, newest first
app.get("/api/students/:id/food-log", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, food_name, logged_at FROM food_log WHERE student_id = ? ORDER BY logged_at DESC",
    [req.params.id]
  );
  res.json(rows);
});

// runs a check-in photo through the CNN + rule engine. The real pipeline
// progress (face-crop, model load, prediction, rule-engine matching, DB
// save...) is written to a real per-student log file on disk instead of
// being streamed to the frontend — see startCheckinLog() above. The
// frontend only sees a "result" (or "error") event once everything is done.
app.post("/api/checkin", upload.single("photo"), async (req, res) => {
  const { student_id, session_id } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: "No photo uploaded" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const { logFile, logStep } = startCheckinLog(student_id);
  logStep(`Check-in started for student ${student_id} (session ${session_id || "none"})`);
  logStep("Backend received the photo, starting mood detection");

  // "-u" forces Python's stdout to be unbuffered, so each progress line
  // reaches us as soon as it's printed instead of all arriving in one
  // burst right before the process exits.
  const child = spawn("python", ["-u", "ml/connect_mood_to_food.py", "--json", req.file.path], { cwd: ML_ROOT });

  let resultLine = null;
  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep the last (possibly incomplete) line for the next chunk
    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, "").replace(/\x1b\[[0-9;]*m/g, "");
      if (!line.trim()) continue;
      if (line.startsWith("RESULT_JSON:")) {
        resultLine = line.slice("RESULT_JSON:".length);
      } else if (/^\d+\/\d+ /.test(line)) {
        continue; // Keras's own step-progress bar, not a real pipeline stage
      } else {
        logStep(line);
      }
    }
  });

  let stderrOutput = "";
  child.stderr.on("data", (chunk) => {
    stderrOutput += chunk.toString();
  });

  child.on("close", async (code) => {
    fs.unlink(req.file.path, () => {}); // clean up the temp upload either way

    if (code !== 0 || !resultLine) {
      logStep(`ERROR: mood detection failed (exit code ${code})`);
      if (stderrOutput) logStep(`stderr: ${stderrOutput}`);
      console.error(stderrOutput);
      sendEvent("error", { error: "Mood detection failed", logFile });
      return res.end();
    }

    const { mood, foods: rawFoods } = JSON.parse(resultLine);
    logStep(`ML finished — detected mood: ${mood}, ${rawFoods.length} foods matched`);

    // Remove anything the parent has restricted before this ever becomes a
    // saved recommendation - restrictions apply at the point a suggestion is
    // generated, not just when it's displayed.
    const [restrictionRows] = await pool.query(
      "SELECT food_name FROM food_restrictions WHERE student_id = ?",
      [student_id]
    );
    const restricted = new Set(restrictionRows.map((r) => r.food_name));
    let foods = rawFoods.filter((name) => !restricted.has(name));
    if (restricted.size) {
      logStep(`Removed ${rawFoods.length - foods.length} restricted food(s) from the suggestion list`);
    }
    // Every mood must still show something - if the parent restricted every
    // matched food, fall back to any unrestricted food in the dataset rather
    // than showing an empty list.
    if (foods.length === 0) {
      foods = Object.keys(foodNutrients).filter((name) => !restricted.has(name)).slice(0, 3);
      logStep("All matched foods were restricted - falling back to other unrestricted foods");
    }

    logStep("Saving the result to the database");

    const [moodResult] = await pool.query(
      "INSERT INTO moods (student_id, session_id, mood) VALUES (?, ?, ?)",
      [student_id, session_id || null, mood]
    );
    const mood_id = moodResult.insertId;

    for (const food_name of foods) {
      await pool.query(
        "INSERT INTO food_recommendations (mood_id, food_name) VALUES (?, ?)",
        [mood_id, food_name]
      );
    }

    if (CONCERNING_MOODS.has(String(mood).toLowerCase())) {
      await pool.query("INSERT INTO alerts (mood_id) VALUES (?)", [mood_id]);
      logStep("Mood is concerning — parent alert saved");
    }

    logStep("Sending the result back to the app");
    sendEvent("result", { mood_id, mood, foods, logFile });
    res.end();
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EduEats backend running on http://localhost:${PORT}`));
