import { useEffect, useState } from "react";
import "./Progress.css";
import "../Overview/Overview.css";

const API_BASE = "http://localhost:3000";
const CHART_W = 320;
const CHART_H = 160;
const MIN_BAR_H = 4;

function formatHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Purely presentational — real bars come from whatever `days` the parent
// already fetched for the selected range, so this chart and the Study Time
// stat above it always agree with each other.
function StudyTimeTrendChart({ days }) {
  if (!days.length) {
    return <p className="bar-chart-empty">No study sessions in this period yet.</p>;
  }

  const sorted = [...days].sort((a, b) => new Date(a.day) - new Date(b.day));
  const maxMinutes = Math.max(...sorted.map((d) => d.minutes), 60);
  const barW = CHART_W / sorted.length;
  // Monthly bars are numerous enough that weekday labels would overlap —
  // show the day-of-month instead, every bar for a week, every few for a month.
  const showEveryLabel = sorted.length <= 7;

  return (
    <svg className="bar-chart" viewBox={`0 0 ${CHART_W} ${CHART_H + 16}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent2)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      {sorted.map((d, i) => {
        const h = Math.max((Number(d.minutes) / maxMinutes) * CHART_H, MIN_BAR_H);
        const date = new Date(d.day);
        const label = showEveryLabel
          ? date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)
          : String(date.getDate());
        return (
          <g key={d.day}>
            <rect
              x={i * barW + barW * 0.22}
              y={CHART_H - h}
              width={barW * 0.56}
              height={h}
              rx={Math.min(barW * 0.28, 8)}
              fill="url(#barGradient)"
            />
            {(showEveryLabel || i % 4 === 0) && (
              <text className="bar-axis" x={i * barW + barW / 2} y={CHART_H + 13} textAnchor="middle">{label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Focus Rate and Healthy Food Days are both derived from real state already
// loaded in Dashboard (subjects = real per-subject focus %, timeline = real
// mood history) — not invented here. Study Time and the chart both come
// from the same real /sessions/week (or ?range=month) fetch below, so
// switching Weekly/Monthly actually changes both together.
export default function ProgressPage({ studentId, subjects, timeline }) {
  const [range, setRange] = useState("weekly");
  const [days, setDays] = useState([]);
  const [longestMinutes, setLongestMinutes] = useState(0);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    const rangeQuery = range === "monthly" ? "?range=month" : "";
    fetch(`${API_BASE}/api/students/${studentId}/sessions/week${rangeQuery}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setDays(data);
      })
      .catch(() => {});
    fetch(`${API_BASE}/api/students/${studentId}/sessions/longest${rangeQuery}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setLongestMinutes(data.longestMinutes || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [studentId, range]);

  const rangeMinutes = days.reduce((sum, d) => sum + Number(d.minutes || 0), 0);

  const focusRate = subjects.length
    ? Math.round(subjects.reduce((sum, s) => sum + s.score, 0) / subjects.length)
    : 0;

  const goodDays = new Set();
  timeline.forEach((entry) => {
    if (!entry.mood.concerning) goodDays.add(entry.when.split(" ")[0]);
  });
  const healthyDays = Math.min(goodDays.size, 5);

  // Real counts the 3 badges below are actually conditioned on — no badge
  // shows as "unlocked" unless its real threshold is actually met.
  const daysStudied = days.filter((d) => Number(d.minutes) > 0).length;
  const badges = [
    {
      icon: "🎯",
      title: "Deep Focus Explorer",
      unlocked: focusRate >= 70,
      desc: focusRate >= 70 ? "Averaging 70%+ focus this period" : `${focusRate}% focus so far — reach 70% to unlock`,
    },
    {
      icon: "🥑",
      title: "Brain Fuel Pro",
      unlocked: healthyDays >= 3,
      desc: healthyDays >= 3
        ? `${healthyDays} healthy mood days this week`
        : `${healthyDays}/3 healthy mood days — keep going`,
    },
    {
      icon: "🔥",
      title: "Habit Builder",
      unlocked: daysStudied >= 3,
      desc: daysStudied >= 3
        ? `Studied on ${daysStudied} different days this period`
        : `Studied on ${daysStudied}/3 days this period`,
    },
  ];

  return (
    <div className="dash-card focused">
      <div className="card-head" style={{ marginBottom: 10 }}>
        <div className="range-toggle">
          <button type="button" className={range === "weekly" ? "active" : ""} onClick={() => setRange("weekly")}>Weekly</button>
          <button type="button" className={range === "monthly" ? "active" : ""} onClick={() => setRange("monthly")}>Monthly</button>
        </div>
        <button className="btn-outline" type="button" onClick={() => window.print()}>⬇️ Export summary</button>
      </div>

      <div className="stat-row" style={{ marginBottom: 22 }}>
        <div className="stat-card">
          <div className="stat-icon">📖</div>
          <div>
            <p className="stat-label">Study Time ({range === "monthly" ? "30 days" : "7 days"})</p>
            <p className="stat-value">{formatHours(rangeMinutes)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🍎</div>
          <div>
            <p className="stat-label">Healthy Food</p>
            <p className="stat-value">{healthyDays} / 5 days</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div>
            <p className="stat-label">Focus Rate</p>
            <p className="stat-value">{focusRate}%</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div>
            <p className="stat-label">Longest session</p>
            <p className="stat-value">{longestMinutes} min</p>
          </div>
        </div>
      </div>

      <h2 className="heading-font">Study Time Trend</h2>
      <StudyTimeTrendChart days={days} />

      <div className="student-badges-section">
        <h3 className="heading-font" style={{ margin: "0 0 6px", fontSize: "0.98rem" }}>
          Your Study Achievements 🏆
        </h3>
        <p className="section-label" style={{ margin: 0 }}>
          Real milestones based on this period's focus, mood, and study data
        </p>

        <div className="student-badges-grid">
          {badges.map((b) => (
            <div key={b.title} className={"student-badge-card" + (b.unlocked ? "" : " locked")}>
              <span className="badge-icon" aria-hidden="true">{b.icon}</span>
              <div>
                <div className="badge-title">{b.title}</div>
                <div className="badge-desc">{b.desc}</div>
                <div className={"badge-status " + (b.unlocked ? "unlocked" : "locked")}>
                  {b.unlocked ? "Unlocked" : "Locked"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
