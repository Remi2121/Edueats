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

// the ml/ scripts use paths like "data/..." and "ml/..." relative to the EduEats/ repo root,
// so the Python process must be run with that folder as its working directory
const ML_ROOT = path.join(__dirname, "..");

// moods the rule engine treats as needing a parent alert — mirrors the
// `concerning` flags in frontend/src/data/moods.js
const CONCERNING_MOODS = new Set(["sad", "angry", "fear", "disgust"]);

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

// creates a new class session for a student
app.post("/api/sessions", async (req, res) => {
  const { student_id, subject, duration_min } = req.body;
  const [result] = await pool.query(
    "INSERT INTO sessions (student_id, subject, duration_min) VALUES (?, ?, ?)",
    [student_id, subject, duration_min]
  );
  res.json({ id: result.insertId, student_id, subject, duration_min });
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
