import { useEffect, useState } from "react";
import "./Dashboard.css";
import Sidebar from "./Sidebar/Sidebar";
import ClassSessionCard from "./ClassSessionCard/ClassSessionCard";
import MoodHistoryCard from "./MoodHistoryCard/MoodHistoryCard";
import NutritionCard from "./NutritionCard/NutritionCard";
import FocusBySubjectCard from "./FocusBySubjectCard/FocusBySubjectCard";
import AlertsCard from "./AlertsCard/AlertsCard";
import { MOODS, formatHistoryTimestamp, timeNow } from "../../data/moods";

const API_BASE = "http://localhost:3000";

// Individual check-ins aren't shown one at a time — the system silently
// collects this many readings, then combines them by majority vote (the
// mood that showed up most) and reveals a single combined result. This
// repeats for every new batch of readings during a session.
const CHECKIN_BATCH_SIZE = 3;

const SEED_TIMELINE = [
  { moodName: "Neutral", when: "Mon 9:05 AM" }, { moodName: "Happy", when: "Mon 1:40 PM" },
  { moodName: "Sad", when: "Tue 8:55 AM" }, { moodName: "Neutral", when: "Tue 12:15 PM" },
  { moodName: "Happy", when: "Wed 9:10 AM" }, { moodName: "Surprise", when: "Wed 2:05 PM" },
  { moodName: "Angry", when: "Thu 11:30 AM" }, { moodName: "Neutral", when: "Thu 3:00 PM" },
  { moodName: "Happy", when: "Fri 9:00 AM" }, { moodName: "Happy", when: "Fri 1:20 PM" },
].map((e) => ({ mood: MOODS.find((m) => m.name === e.moodName), when: e.when }));

export default function Dashboard({ student, onLogout }) {
  const [activeView, setActiveView] = useState("overview");
  const [subjects, setSubjects] = useState([
    { name: "Mathematics", score: 58 },
    { name: "Science", score: 68 },
    { name: "English", score: 74 },
    { name: "History", score: 55 },
  ]);
  const [session, setSession] = useState({ subject: null, running: false, id: null });
  const [latestMood, setLatestMood] = useState(MOODS[0]);
  const [moodUpdatedLabel, setMoodUpdatedLabel] = useState("Last updated Fri 1:20 PM");
  const [timeline, setTimeline] = useState(SEED_TIMELINE);
  const [snacks, setSnacks] = useState(MOODS[0].snacks);
  const [alerts, setAlerts] = useState([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinError, setCheckinError] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [pendingBatch, setPendingBatch] = useState([]);

  // Loads this student's real mood/nutrition/alert history from MySQL once,
  // on first load — replacing the hardcoded seed data with it whenever real
  // rows exist. A brand-new account with no history yet keeps the seed data
  // as a friendly starting point rather than showing an empty dashboard.
  useEffect(() => {
    if (!student.id) return;
    let cancelled = false;

    async function loadHistory() {
      try {
        const [moodsRes, nutritionRes, alertsRes] = await Promise.all([
          fetch(`${API_BASE}/api/students/${student.id}/moods`),
          fetch(`${API_BASE}/api/students/${student.id}/nutrition`),
          fetch(`${API_BASE}/api/students/${student.id}/alerts`),
        ]);
        const [moodsData, nutritionData, alertsData] = await Promise.all([
          moodsRes.json(),
          nutritionRes.json(),
          alertsRes.json(),
        ]);
        if (cancelled) return;

        if (moodsData.length) {
          const toMood = (name) => MOODS.find((m) => m.name.toLowerCase() === String(name).toLowerCase()) || MOODS[0];
          setTimeline(
            moodsData
              .slice()
              .reverse() // backend returns newest first; the timeline strip reads oldest-to-newest
              .map((m) => ({ mood: toMood(m.mood), when: formatHistoryTimestamp(m.detected_at) }))
          );
          const latest = moodsData[0];
          setLatestMood(toMood(latest.mood));
          setMoodUpdatedLabel(`Last updated ${formatHistoryTimestamp(latest.detected_at)}`);
        }
        if (nutritionData.length) setSnacks(nutritionData);
        if (alertsData.length) {
          const toMood = (name) => MOODS.find((m) => m.name.toLowerCase() === String(name).toLowerCase()) || MOODS[0];
          setAlerts(
            alertsData.map((a) => ({
              mood: toMood(a.mood),
              subject: a.subject,
              time: formatHistoryTimestamp(a.sent_at),
            }))
          );
        }
      } catch {
        // Backend unreachable — keep showing the local seed/default data.
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [student.id]);

  function show(view) {
    return activeView === "overview" || activeView === view;
  }
  function focused(view) {
    return activeView !== "overview" && activeView === view;
  }

  async function handleStart(subjectName, durationMin) {
    if (!subjects.some((s) => s.name === subjectName)) {
      setSubjects((prev) => [...prev, { name: subjectName, score: 60 }]);
    }
    setSession({ subject: subjectName, running: true, id: null });
    setCheckinError("");
    setLastResult(null);
    setPendingBatch([]);

    // Guest/Google/Apple accounts have no real database row (student.id is
    // null) — the session just stays local-only for them, same as before.
    if (!student.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: student.id, subject: subjectName, duration_min: durationMin }),
      });
      const data = await res.json();
      if (res.ok) setSession((prev) => ({ ...prev, id: data.id }));
    } catch {
      // Keep the session running locally even if the backend call failed —
      // check-in without a session_id still saves a mood, just unlinked.
    }
  }

  function handleStop() {
    setSession({ subject: null, running: false, id: null });
  }

  // Sends one captured frame to the real CNN + rule-engine endpoint and
  // applies whatever mood/foods it actually returns.
  async function handleCheckIn(photoBlob) {
    setCheckinError("");
    if (!student.id) {
      setCheckinError("Sign up with email & password to use real check-in (Google/Apple demo accounts aren't saved).");
      return;
    }

    setCheckingIn(true);
    try {
      const formData = new FormData();
      formData.append("photo", photoBlob, "checkin.jpg");
      formData.append("student_id", student.id);
      if (session.id) formData.append("session_id", session.id);

      const res = await fetch(`${API_BASE}/api/checkin`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setCheckinError(data.error || "Check-in failed.");
        return;
      }

      const mood = MOODS.find((m) => m.name.toLowerCase() === String(data.mood).toLowerCase()) || MOODS[0];
      const foods = data.foods && data.foods.length ? data.foods : mood.snacks;

      // Collect this reading silently. Nothing is shown on screen until a
      // full batch (CHECKIN_BATCH_SIZE readings) is ready to be combined.
      const newBatch = [...pendingBatch, { mood, foods }];
      if (newBatch.length < CHECKIN_BATCH_SIZE) {
        setPendingBatch(newBatch);
        return;
      }
      setPendingBatch([]); // start collecting the next batch

      // Majority vote: whichever mood showed up most across the batch wins.
      // Ties go to whichever mood reached that count first.
      const counts = {};
      let winningEntry = newBatch[0];
      let winningCount = 0;
      for (const entry of newBatch) {
        const count = (counts[entry.mood.name] = (counts[entry.mood.name] || 0) + 1);
        if (count > winningCount) {
          winningCount = count;
          winningEntry = entry;
        }
      }
      const now = timeNow();

      setLatestMood(winningEntry.mood);
      setMoodUpdatedLabel(`Last updated today ${now}`);
      setTimeline((prev) => [...prev, { mood: winningEntry.mood, when: `today ${now}` }]);
      setSnacks(winningEntry.foods);
      setLastResult(winningEntry);

      if (session.subject) {
        setSubjects((prev) =>
          prev.map((s) =>
            s.name === session.subject
              ? { ...s, score: Math.max(0, Math.min(100, s.score + winningEntry.mood.valence)) }
              : s
          )
        );
      }
      if (winningEntry.mood.concerning) {
        setAlerts((prev) => [{ mood: winningEntry.mood, subject: session.subject, time: now }, ...prev]);
      }
    } catch {
      setCheckinError("Could not reach the server. Is the backend running?");
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar student={student} activeView={activeView} onNavigate={setActiveView} onLogout={onLogout} />
      <main className="main">
        <div className="topbar">
          <h1 className="heading-font">Good morning, {student.name.split(" ")[0]}.</h1>
          <p className="date mono">{new Date().toDateString()}</p>
        </div>

        <section className="dash-grid">
          <ClassSessionCard
            hidden={activeView !== "overview"}
            session={session}
            onStart={handleStart}
            onStop={handleStop}
            onCheckIn={handleCheckIn}
            checkingIn={checkingIn}
            checkinError={checkinError}
            result={lastResult}
            batchCount={pendingBatch.length}
            batchSize={CHECKIN_BATCH_SIZE}
          />
          <MoodHistoryCard
            hidden={!show("history")}
            focused={focused("history")}
            latestMood={latestMood}
            moodUpdatedLabel={moodUpdatedLabel}
            timeline={timeline}
          />
          <NutritionCard hidden={!show("nutrition")} focused={focused("nutrition")} snacks={snacks} />
          <FocusBySubjectCard hidden={activeView !== "overview"} subjects={subjects} />
          <AlertsCard hidden={!show("alerts")} focused={focused("alerts")} alerts={alerts} />
        </section>
      </main>
    </div>
  );
}
