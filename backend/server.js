require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
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
    const [food_name, calories, fat_g, sugar_g, water_ml, magnesium_mg, vitamin_b_mg] = cells;
    foodNutrients[food_name] = {
      food_name,
      calories: Number(calories),
      fat_g: Number(fat_g),
      sugar_g: Number(sugar_g),
      water_ml: Number(water_ml),
      magnesium_mg: Number(magnesium_mg),
      vitamin_b_mg: Number(vitamin_b_mg),
    };
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

// returns a student's real parent-alert history from MySQL, newest first
app.get("/api/students/:id/alerts", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.id, a.sent_at, m.mood, s.subject
     FROM alerts a
     JOIN moods m ON a.mood_id = m.id
     LEFT JOIN sessions s ON m.session_id = s.id
     WHERE m.student_id = ?
     ORDER BY a.sent_at DESC`,
    [req.params.id]
  );
  res.json(rows);
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
// (started_at to ended_at, or to now if it's still running), not a guess
app.get("/api/students/:id/sessions/today", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT subject, TIMESTAMPDIFF(MINUTE, started_at, COALESCE(ended_at, NOW())) AS minutes
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
// as /sessions/today
app.get("/api/students/:id/sessions/week", async (req, res) => {
  const days = req.query.range === "month" ? 29 : 6;
  const [rows] = await pool.query(
    `SELECT DATE(started_at) AS day,
            SUM(TIMESTAMPDIFF(MINUTE, started_at, COALESCE(ended_at, NOW()))) AS minutes
     FROM sessions
     WHERE student_id = ? AND started_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(started_at)`,
    [req.params.id, days]
  );
  res.json(rows.map((r) => ({ day: r.day, minutes: r.minutes })));
});

// real nutrient values for one food, from the same CSV the rule engine uses
app.get("/api/foods/:name", (req, res) => {
  const food = foodNutrients[req.params.name];
  if (!food) return res.status(404).json({ error: "Unknown food" });
  res.json(food);
});

// runs a check-in photo through the CNN + rule engine, saves the result, returns it
app.post("/api/checkin", upload.single("photo"), async (req, res) => {
  const { student_id, session_id } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: "No photo uploaded" });
  }

  execFile(
    "python",
    ["ml/connect_mood_to_food.py", "--json", req.file.path],
    { cwd: ML_ROOT },
    async (err, stdout) => {
      fs.unlink(req.file.path, () => {}); // clean up the temp upload either way

      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Mood detection failed" });
      }

      // predict.py also prints log lines to stdout; the JSON result is always the last line
      const lines = stdout.trim().split("\n");
      const { mood, foods } = JSON.parse(lines[lines.length - 1]);

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
      }

      res.json({ mood_id, mood, foods });
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EduEats backend running on http://localhost:${PORT}`));
