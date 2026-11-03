import { MOODS } from "../../../data/moods";
import "./Overview.css";

const VALENCE_MIN = -5;
const VALENCE_MAX = 6;
const CHART_W = 460;
const CHART_H = 180;
const TOP_PAD = 18; // room above the highest dot for its mood emoji label
const LEFT_PAD = 70; // room for the real mood-name Y-axis labels

function yFor(valence) {
  const t = (valence - VALENCE_MIN) / (VALENCE_MAX - VALENCE_MIN);
  return CHART_H - t * CHART_H;
}

// Real Y-axis labels — one gridline per distinct valence level among our 7
// real moods (not an abstract number), so the axis reads as actual mood
// names (e.g. "Sad / Fear") instead of a meaningless numeric scale.
const VALENCE_LEVELS = (() => {
  const byValence = {};
  MOODS.forEach((m) => {
    (byValence[m.valence] = byValence[m.valence] || []).push(m.name);
  });
  return Object.entries(byValence)
    .map(([valence, names]) => ({ valence: Number(valence), label: names.join(" / ") }))
    .sort((a, b) => b.valence - a.valence);
})();

// Plots real valence values from the most recent check-ins (not invented
// numbers) — each mood's valence score is the same one already used to
// nudge Focus by Subject scores. The Y-axis is labeled with real mood
// names at their real valence level, not a bare number, so the chart is
// readable without already knowing what "valence" means.
export default function MoodTrendCard({ entries }) {
  const recent = entries.slice(-7);

  if (recent.length < 2) {
    return (
      <div className="dash-card">
        <h2 className="heading-font">Today's Mood Trend</h2>
        <p className="trend-empty">Not enough check-ins yet to show a trend.</p>
      </div>
    );
  }

  const step = (CHART_W - LEFT_PAD) / (recent.length - 1);
  const points = recent.map((e, i) => [LEFT_PAD + i * step, yFor(e.mood.valence)]);
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const fillPath = `${linePath} L${points[points.length - 1][0]},${CHART_H} L${LEFT_PAD},${CHART_H} Z`;

  return (
    <div className="dash-card">
      <h2 className="heading-font">Today's Mood Trend</h2>
      <svg className="trend-chart" viewBox={`0 0 ${CHART_W} ${CHART_H + 24 + TOP_PAD}`} preserveAspectRatio="xMidYMid meet">
        <g transform={`translate(0, ${TOP_PAD})`}>
          {VALENCE_LEVELS.map((level) => (
            <g key={level.valence}>
              <line
                className="trend-gridline"
                x1={LEFT_PAD}
                x2={CHART_W}
                y1={yFor(level.valence)}
                y2={yFor(level.valence)}
              />
              <text className="trend-y-label" x={LEFT_PAD - 8} y={yFor(level.valence) + 3} textAnchor="end">
                {level.label}
              </text>
            </g>
          ))}

          <path className="trend-fill" d={fillPath} />
          <path className="trend-line" d={linePath} />
          {points.map(([x, y], i) => (
            <g key={i}>
              <circle className="trend-dot" cx={x} cy={y} r="4">
                <title>{recent[i].mood.name}</title>
              </circle>
              <text className="trend-point-emoji" x={x} y={y - 10} textAnchor="middle">
                {recent[i].mood.emoji}
              </text>
            </g>
          ))}
          {recent.map((e, i) => (
            <text key={i} className="trend-axis" x={LEFT_PAD + i * step} y={CHART_H + 18} textAnchor="middle">
              {e.when.split(" ").slice(-2).join(" ")}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
