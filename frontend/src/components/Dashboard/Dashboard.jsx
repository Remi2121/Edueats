import { useEffect, useState } from "react";
import "./Dashboard.css";
import Sidebar from "./Sidebar/Sidebar";
import ClassSessionCard from "./ClassSessionCard/ClassSessionCard";
import MoodHistoryCard from "./MoodHistoryCard/MoodHistoryCard";
import MoodSummaryCard from "./MoodHistoryCard/MoodSummaryCard";
import NutritionCard from "./NutritionCard/NutritionCard";
import FocusBySubjectCard from "./FocusBySubjectCard/FocusBySubjectCard";
import AlertsCard from "./AlertsCard/AlertsCard";
import PostureAlertsCard from "./AlertsCard/PostureAlertsCard";
import StatRow from "./Overview/StatRow";
import RecommendationCard from "./Overview/RecommendationCard";
import QuickActionsCard from "./Overview/QuickActionsCard";
import StudySummaryCard from "./Overview/StudySummaryCard";
import MoodTrendCard from "./Overview/MoodTrendCard";
import ProgressPage from "./Progress/ProgressPage";
import SettingsPanel from "./SettingsPanel/SettingsPanel";
import { MOODS, formatHistoryTimestamp, initials, timeNow } from "../../data/moods";

const API_BASE = "http://localhost:3000";

// Individual check-ins aren't shown one at a time — the system silently
// collects this many readings, then combines them by majority vote (the
// mood that showed up most) and reveals a single combined result. This
// repeats for every new batch of readings during a session.
const CHECKIN_BATCH_SIZE = 3;

// Posture follows the same "15 min reading, 45 min (3 readings) decision"
// cadence as mood, rather than alerting on a single bad reading.
const POSTURE_BATCH_SIZE = 3;

const SEED_TIMELINE = [
  { moodName: "Neutral", when: "Mon 9:05 AM" }, { moodName: "Happy", when: "Mon 1:40 PM" },
  { moodName: "Sad", when: "Tue 8:55 AM" }, { moodName: "Neutral", when: "Tue 12:15 PM" },
  { moodName: "Happy", when: "Wed 9:10 AM" }, { moodName: "Surprise", when: "Wed 2:05 PM" },
  { moodName: "Angry", when: "Thu 11:30 AM" }, { moodName: "Neutral", when: "Thu 3:00 PM" },
  { moodName: "Happy", when: "Fri 9:00 AM" }, { moodName: "Happy", when: "Fri 1:20 PM" },
].map((e) => ({ mood: MOODS.find((m) => m.name === e.moodName), when: e.when }));

export default function Dashboard({ student, onLogout, theme, onToggleTheme }) {
  const [activeView, setActiveView] = useState("overview");
  // Real per-subject focus % computed server-side from actual mood+session
  // rows — not a locally nudged placeholder. Empty until real data exists.
  const [subjects, setSubjects] = useState([]);
  // Real minutes studied today, summed server-side from each session's
  // actual started_at/ended_at — not an estimate.
  const [studyMinutes, setStudyMinutes] = useState(0);
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
  const [postureAlerts, setPostureAlerts] = useState([]);
  const [pendingPostureBatch, setPendingPostureBatch] = useState([]);

  // Re-fetches real per-subject focus scores and today's real study minutes
  // from the backend — called on load and again after every check-in reveal
  // so both numbers reflect the database, not a locally nudged guess.
  async function refreshFocusAndStudyTime() {
    if (!student.id) return;
    try {
      const [focusRes, sessionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/students/${student.id}/focus`),
        fetch(`${API_BASE}/api/students/${student.id}/sessions/today`),
      ]);
      const [focusData, sessionsData] = await Promise.all([focusRes.json(), sessionsRes.json()]);
      setSubjects(focusData.map((f) => ({ name: f.subject, score: f.score })));
      setStudyMinutes(sessionsData.totalMinutes || 0);
    } catch {
      // Keep whatever was last loaded if the backend isn't reachable.
    }
  }

  // Loads this student's real mood/nutrition/alert/focus/study-time history
  // from MySQL once, on first load — replacing the hardcoded seed data with
  // it whenever real rows exist. A brand-new account with no history yet
  // keeps the seed data as a friendly starting point, not an empty dashboard.
  useEffect(() => {
    if (!student.id) return;
    let cancelled = false;

    async function loadHistory() {
      try {
        const [moodsRes, nutritionRes, alertsRes, postureAlertsRes] = await Promise.all([
          fetch(`${API_BASE}/api/students/${student.id}/moods`),
          fetch(`${API_BASE}/api/students/${student.id}/nutrition`),
          fetch(`${API_BASE}/api/students/${student.id}/alerts`),
          fetch(`${API_BASE}/api/students/${student.id}/posture-alerts`),
        ]);
        const [moodsData, nutritionData, alertsData, postureAlertsData] = await Promise.all([
          moodsRes.json(),
          nutritionRes.json(),
          alertsRes.json(),
          postureAlertsRes.json(),
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
        if (postureAlertsData.length) {
          setPostureAlerts(
            postureAlertsData.map((a) => ({ subject: a.subject, time: formatHistoryTimestamp(a.sent_at) }))
          );
        }
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
    refreshFocusAndStudyTime();
    return () => {
      cancelled = true;
    };
  }, [student.id]);

  async function handleStart(subjectName, durationMin) {
    setSession({ subject: subjectName, running: true, id: null });
    setCheckinError("");
    setLastResult(null);
    setPendingBatch([]);
    setPendingPostureBatch([]);

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
    // Marks the real end time in the database so today's study-time total
    // reflects how long the session actually ran.
    if (session.id) {
      fetch(`${API_BASE}/api/sessions/${session.id}/end`, { method: "PATCH" })
        .then(refreshFocusAndStudyTime)
        .catch(() => {});
    }
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

      // Focus-by-subject and today's study time are both computed
      // server-side from the mood/session rows this check-in just saved —
      // re-fetch rather than nudge a local number.
      refreshFocusAndStudyTime();

      if (winningEntry.mood.concerning) {
        setAlerts((prev) => [{ mood: winningEntry.mood, subject: session.subject, time: now }, ...prev]);
      }
    } catch {
      setCheckinError("Could not reach the server. Is the backend running?");
    } finally {
      setCheckingIn(false);
    }
  }

  // Saves one real posture reading (detected client-side by MediaPipe) and,
  // once 3 of them have come in (45 real minutes), alerts the parent only
  // if most of that batch was poor — a single slouch doesn't trigger a
  // notification on its own, same reasoning as the mood batch above.
  async function handlePostureCheck(status) {
    if (!student.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/posture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: student.id, session_id: session.id || null, status }),
      });
      const data = await res.json();
      if (!res.ok) return;

      const newBatch = [...pendingPostureBatch, { posture_check_id: data.posture_check_id, status }];
      if (newBatch.length < POSTURE_BATCH_SIZE) {
        setPendingPostureBatch(newBatch);
        return;
      }
      setPendingPostureBatch([]);

      const poorCount = newBatch.filter((b) => b.status === "poor").length;
      if (poorCount > newBatch.length / 2) {
        const lastPoor = [...newBatch].reverse().find((b) => b.status === "poor");
        await fetch(`${API_BASE}/api/posture/alert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posture_check_id: lastPoor.posture_check_id }),
        });
        setPostureAlerts((prev) => [{ subject: session.subject, time: timeNow() }, ...prev]);
      }
    } catch {
      // Posture reporting failing shouldn't interrupt the study session.
    }
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="main">
        <div className="topbar">
          <div>
            <h1 className="heading-font">Hi, {student.name.split(" ")[0]}! 👋</h1>
            <p className="date mono">Stay focused, eat healthy, and learn better.</p>
          </div>
          <div className="topbar-right">
            <button
              className="bell-btn"
              type="button"
              aria-label={alerts.length ? `${alerts.length} alerts` : "No alerts"}
              onClick={() => setActiveView("moodfocus")}
            >
              🔔
              {alerts.length > 0 && <span className="bell-dot" />}
            </button>
            <div className="topbar-user">
              <div className="topbar-avatar">
                {student.photoDataUrl ? <img src={student.photoDataUrl} alt="" /> : initials(student.name)}
              </div>
              <div>
                <div className="topbar-user-name">{student.name.split(" ")[0]}</div>
                <div className="topbar-user-class">{student.classLine.split(" · ")[0]}</div>
              </div>
            </div>
          </div>
        </div>

        {activeView === "overview" && (
          <>
            <StatRow latestMood={latestMood} studyMinutes={studyMinutes} />
            <div className="overview-row">
              <RecommendationCard snacks={snacks} />
              <div className="overview-col">
                <QuickActionsCard onNavigate={setActiveView} />
                <StudySummaryCard latestMood={latestMood} nutritionOnTrack={!latestMood.concerning} studyMinutes={studyMinutes} />
              </div>
            </div>
          </>
        )}

        <section className="dash-grid">
          <ClassSessionCard
            hidden={activeView !== "study"}
            session={session}
            onStart={handleStart}
            onStop={handleStop}
            onCheckIn={handleCheckIn}
            onPostureCheck={handlePostureCheck}
            checkingIn={checkingIn}
            checkinError={checkinError}
            result={lastResult}
            batchCount={pendingBatch.length}
            batchSize={CHECKIN_BATCH_SIZE}
          />

          {activeView === "nutrition" && <NutritionCard focused snacks={snacks} />}

          {activeView === "moodfocus" && (
            <>
              <MoodSummaryCard timeline={timeline} />
              <MoodTrendCard entries={timeline} />
              <MoodHistoryCard focused latestMood={latestMood} moodUpdatedLabel={moodUpdatedLabel} timeline={timeline} />
              <AlertsCard focused alerts={alerts} />
              <PostureAlertsCard alerts={postureAlerts} />
            </>
          )}

          {activeView === "progress" && (
            <>
              <ProgressPage studentId={student.id} subjects={subjects} timeline={timeline} />
              <FocusBySubjectCard subjects={subjects} />
            </>
          )}

          {activeView === "settings" && (
            <SettingsPanel student={student} theme={theme} onToggleTheme={onToggleTheme} onLogout={onLogout} />
          )}
        </section>
      </main>
    </div>
  );
}
