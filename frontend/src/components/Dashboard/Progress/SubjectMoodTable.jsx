import { useEffect, useState } from "react";
import { MOODS } from "../../../data/moods";
import "./Progress.css";

const API_BASE = "http://localhost:3000";
const DAYS_SHOWN = 35; // "last 5 weeks"

function moodMeta(name) {
  return MOODS.find((m) => m.name.toLowerCase() === String(name).toLowerCase());
}

// Real per-subject mood breakdown as a table, over the real last 5 weeks —
// columns are whichever real moods actually occurred (sorted by overall
// frequency), not a fixed fake set, since our real 7 FER-2013 moods don't
// map onto any fixed small category list.
export default function SubjectMoodTable({ studentId }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!studentId) {
      setRows([]);
      return;
    }
    fetch(`${API_BASE}/api/students/${studentId}/moods`)
      .then((res) => res.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, [studentId]);

  if (rows === null) {
    return (
      <div className="dash-card" style={{ gridColumn: "1 / -1" }}>
        <h2 className="heading-font">Subject-wise mood patterns</h2>
        <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal" }}>Loading…</p>
      </div>
    );
  }

  const cutoff = Date.now() - DAYS_SHOWN * 24 * 60 * 60 * 1000;
  const recent = rows.filter((r) => r.subject && r.detected_at && new Date(r.detected_at).getTime() >= cutoff);

  const overallCounts = {};
  recent.forEach((r) => { overallCounts[r.mood] = (overallCounts[r.mood] || 0) + 1; });
  const columns = Object.entries(overallCounts).sort((a, b) => b[1] - a[1]).map(([mood]) => mood).slice(0, 5);

  const bySubject = {};
  recent.forEach((r) => {
    if (!bySubject[r.subject]) bySubject[r.subject] = {};
    bySubject[r.subject][r.mood] = (bySubject[r.subject][r.mood] || 0) + 1;
  });
  const subjects = Object.keys(bySubject).sort();

  return (
    <div className="dash-card" style={{ gridColumn: "1 / -1" }}>
      <h2 className="heading-font">Subject-wise mood patterns</h2>
      <p className="section-label" style={{ marginBottom: 14 }}>Real mood breakdown by subject, last 5 weeks</p>

      {subjects.length === 0 ? (
        <p className="section-label" style={{ textTransform: "none", letterSpacing: "normal" }}>
          No check-ins during a class session in the last 5 weeks yet.
        </p>
      ) : (
        <div className="subject-table-wrap">
          <table className="subject-table">
            <thead>
              <tr>
                <th>Subject</th>
                {columns.map((mood) => {
                  const meta = moodMeta(mood);
                  return <th key={mood}>{meta.emoji} {meta.name}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => {
                const counts = bySubject[subject];
                const total = Object.values(counts).reduce((a, b) => a + b, 0);
                return (
                  <tr key={subject}>
                    <td>{subject}</td>
                    {columns.map((mood) => (
                      <td key={mood}>{counts[mood] ? `${Math.round((counts[mood] / total) * 100)}%` : "—"}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
