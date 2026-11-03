import { useEffect, useState } from "react";
import { MOODS } from "../../../data/moods";
import "./MoodBySubjectCard.css";

const API_BASE = "http://localhost:3000";
const DAYS_SHOWN = 30;

function moodMeta(name) {
  return MOODS.find((m) => m.name.toLowerCase() === String(name).toLowerCase());
}

// Real mood breakdown per real subject, over the last 30 real days — groups
// every real check-in by its real subject and shows what proportion of each
// real mood happened during that subject's sessions, as a segmented bar
// (same visual language as Focus by Subject), with the most common real
// mood labeled.
export default function MoodBySubjectCard({ studentId }) {
  const [bySubject, setBySubject] = useState(null);

  useEffect(() => {
    if (!studentId) {
      setBySubject([]);
      return;
    }
    fetch(`${API_BASE}/api/students/${studentId}/moods`)
      .then((res) => res.json())
      .then((rows) => {
        const cutoff = Date.now() - DAYS_SHOWN * 24 * 60 * 60 * 1000;
        const recentRows = rows.filter((row) => row.detected_at && new Date(row.detected_at).getTime() >= cutoff);
        const grouped = {};
        recentRows.forEach((row) => {
          if (!row.subject) return;
          if (!grouped[row.subject]) grouped[row.subject] = {};
          grouped[row.subject][row.mood] = (grouped[row.subject][row.mood] || 0) + 1;
        });
        const result = Object.entries(grouped).map(([subject, counts]) => {
          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          const segments = Object.entries(counts)
            .map(([mood, count]) => ({ mood, count, pct: (count / total) * 100 }))
            .sort((a, b) => b.count - a.count);
          return { subject, total, segments, dominant: segments[0].mood };
        });
        result.sort((a, b) => b.total - a.total);
        setBySubject(result);
      })
      .catch(() => setBySubject([]));
  }, [studentId]);

  return (
    <div className="dash-card">
      <h2 className="heading-font">Mood by Subject</h2>
      <p className="section-label">Real mood breakdown from the last 30 days, per subject</p>

      {bySubject === null ? (
        <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal" }}>Loading…</p>
      ) : bySubject.length === 0 ? (
        <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal" }}>
          No check-ins during a class session in the last 30 days yet.
        </p>
      ) : (
        <div className="mood-subject-list">
          {bySubject.map((entry) => {
            const dominant = moodMeta(entry.dominant);
            return (
              <div key={entry.subject} className="mood-subject-row">
                <div className="mood-subject-head">
                  <span className="mood-subject-label">{entry.subject}</span>
                  <span className="mood-subject-dominant">
                    {dominant.emoji} {dominant.name}
                  </span>
                </div>
                <div className="mood-subject-track">
                  {entry.segments.map((seg) => {
                    const meta = moodMeta(seg.mood);
                    return (
                      <span
                        key={seg.mood}
                        className="mood-subject-segment"
                        style={{ width: `${seg.pct}%`, background: meta.bg }}
                        title={`${meta.name}: ${seg.count} check-in${seg.count > 1 ? "s" : ""}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
