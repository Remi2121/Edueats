import { useEffect, useState } from "react";
import { MOODS } from "../../../data/moods";
import FoodItem from "../shared/FoodItem";
import "./MoodSummaryCard.css";

const API_BASE = "http://localhost:3000";
const WEEKS = 5;
const MAX_FOODS = 8;

function moodMeta(name) {
  return MOODS.find((m) => m.name.toLowerCase() === String(name).toLowerCase());
}

// Real mood + real matched foods for each of the past 5 weeks — week 1 is
// the most recent 7-day window, week 5 the oldest. Clicking a week shows
// that week's dominant real mood (by majority, same rule as the live
// check-in batching) and every real food the rule engine matched for it.
export default function MoodSummaryCard({ studentId }) {
  const [weeks, setWeeks] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(1);

  useEffect(() => {
    if (!studentId) {
      setWeeks([]);
      return;
    }
    fetch(`${API_BASE}/api/students/${studentId}/mood-weeks?weeks=${WEEKS}`)
      .then((res) => res.json())
      .then(setWeeks)
      .catch(() => setWeeks([]));
  }, [studentId]);

  const entry = weeks?.find((w) => w.week === selectedWeek);
  const mood = entry?.mood ? moodMeta(entry.mood) : null;

  return (
    <div className="dash-card">
      <h2 className="heading-font">Mood Summary</h2>
      <p className="section-label">Past 5 weeks, from your real check-ins</p>

      {weeks === null ? (
        <p className="section-label">Loading…</p>
      ) : (
        <>
          <div className="mood-week-tabs">
            {weeks.map((w) => (
              <button
                key={w.week}
                type="button"
                className={"mood-week-tab" + (selectedWeek === w.week ? " active" : "") + (!w.mood ? " empty" : "")}
                onClick={() => setSelectedWeek(w.week)}
              >
                Week {w.week}
              </button>
            ))}
          </div>

          {entry && (
            <div
              className={"mood-week-detail" + (mood ? " has-mood" : "")}
              style={mood ? { background: mood.bg, color: mood.ink } : undefined}
            >
              <p className="mood-week-range">{entry.start} – {entry.end}</p>
              {!mood ? (
                <p className="section-label">No check-ins that week.</p>
              ) : (
                <>
                  <p className="mood-week-headline">{mood.emoji} Mostly {mood.name} this week</p>
                  {entry.foods.length === 0 ? (
                    <p className="mood-week-sub">No food matched this mood's rule.</p>
                  ) : (
                    <>
                      <p className="mood-week-sub">Foods the rule engine matched:</p>
                      <div className="mood-week-foods">
                        {entry.foods.slice(0, MAX_FOODS).map((food) => (
                          <FoodItem key={food} name={food} variant="chip" />
                        ))}
                        {entry.foods.length > MAX_FOODS && (
                          <span className="mood-week-food-more">+{entry.foods.length - MAX_FOODS} more</span>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
