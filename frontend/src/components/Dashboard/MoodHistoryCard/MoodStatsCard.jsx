import { useEffect, useState } from "react";
import { MOODS } from "../../../data/moods";
import "../Overview/Overview.css";
import "./MoodStatsCard.css";

const API_BASE = "http://localhost:3000";
const PERIODS = ["Today", "This Week", "This Month"];

function moodMeta(name) {
  return MOODS.find((m) => m.name.toLowerCase() === String(name).toLowerCase());
}

function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function periodCutoffMs(period) {
  const now = new Date();
  if (period === "Today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return start.getTime();
  }
  const days = period === "This Week" ? 7 : 30;
  return now.getTime() - days * 24 * 60 * 60 * 1000;
}

// Real mood rows for this student, filtered to the selected real period, used
// to compute a real "most common mood" and a real focus score — the same
// non-concerning-mood percentage the backend's /api/students/:id/focus
// endpoint already defines, just aggregated across all subjects instead of
// per-subject. Study time per period comes from the real session endpoints
// (today's total, or a week/month of daily totals summed).
export default function MoodStatsCard({ studentId }) {
  const [period, setPeriod] = useState("Today");
  const [moodRows, setMoodRows] = useState(null);
  const [studyMinutes, setStudyMinutes] = useState(null);

  useEffect(() => {
    if (!studentId) {
      setMoodRows([]);
      return;
    }
    fetch(`${API_BASE}/api/students/${studentId}/moods`)
      .then((res) => res.json())
      .then(setMoodRows)
      .catch(() => setMoodRows([]));
  }, [studentId]);

  useEffect(() => {
    if (!studentId) {
      setStudyMinutes(null);
      return;
    }
    setStudyMinutes(null);
    if (period === "Today") {
      fetch(`${API_BASE}/api/students/${studentId}/sessions/today`)
        .then((res) => res.json())
        .then((data) => setStudyMinutes(data.totalMinutes || 0))
        .catch(() => setStudyMinutes(0));
    } else {
      const range = period === "This Month" ? "?range=month" : "";
      fetch(`${API_BASE}/api/students/${studentId}/sessions/week${range}`)
        .then((res) => res.json())
        .then((rows) => setStudyMinutes(rows.reduce((sum, r) => sum + Number(r.minutes || 0), 0)))
        .catch(() => setStudyMinutes(0));
    }
  }, [studentId, period]);

  const cutoff = periodCutoffMs(period);
  const filtered = (moodRows || []).filter((r) => r.detected_at && new Date(r.detected_at).getTime() >= cutoff);

  const counts = {};
  filtered.forEach((r) => {
    counts[r.mood] = (counts[r.mood] || 0) + 1;
  });
  const sortedMoods = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const topMood = sortedMoods.length > 0 ? moodMeta(sortedMoods[0][0]) : null;
  const nonConcerning = filtered.filter((r) => !moodMeta(r.mood)?.concerning).length;
  const focusPct = filtered.length > 0 ? Math.round((nonConcerning / filtered.length) * 100) : null;

  return (
    <div className="dash-card">
      <h2 className="heading-font">Mood & Focus Stats</h2>
      <div className="tab-row" style={{ marginBottom: 16 }}>
        {PERIODS.map((p) => (
          <button key={p} className={"tab" + (period === p ? " active" : "")} type="button" onClick={() => setPeriod(p)}>
            {p}
          </button>
        ))}
      </div>

      <div className="stat-row" style={{ marginBottom: 18 }}>
        <div className="stat-card">
          <div className="stat-icon stat-icon-mint">{topMood ? topMood.emoji : "—"}</div>
          <div>
            <p className="stat-label">Most common mood</p>
            <p className="stat-value">{topMood ? topMood.name : "No check-ins yet"}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">◎</div>
          <div>
            <p className="stat-label">Focus score</p>
            <p className="stat-value">{focusPct === null ? "—" : `${focusPct}%`}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-amber">📚</div>
          <div>
            <p className="stat-label">Study time</p>
            <p className="stat-value">{studyMinutes === null ? "…" : formatMinutes(studyMinutes)}</p>
          </div>
        </div>
      </div>

      <p className="section-label" style={{ marginBottom: 10 }}>Mood distribution — {period.toLowerCase()}</p>
      {sortedMoods.length === 0 ? (
        <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal" }}>
          No check-ins {period === "Today" ? "today" : `in the last ${period === "This Week" ? "7" : "30"} days`} yet.
        </p>
      ) : (
        <div className="mood-bars">
          {sortedMoods.map(([mood, count]) => {
            const meta = moodMeta(mood);
            const pct = Math.round((count / filtered.length) * 100);
            return (
              <div className="mood-bar-row" key={mood}>
                <span>{meta.emoji} {meta.name}</span>
                <div className="bar-track"><i style={{ width: `${pct}%`, background: meta.bg }} /></div>
                <b>{pct}%</b>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
