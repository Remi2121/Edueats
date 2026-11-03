import "./Overview.css";

const VALENCE_MIN = -5;
const VALENCE_MAX = 6;
const CHART_W = 280;
const CHART_H = 90;
const TOP_PAD = 16; // room above the highest possible dot for its mood emoji label

function yFor(valence) {
  const t = (valence - VALENCE_MIN) / (VALENCE_MAX - VALENCE_MIN);
  return CHART_H - t * CHART_H;
}

// Plots real valence values from the most recent check-ins (not invented
// numbers) — each mood's valence score is the same one already used to
// nudge Focus by Subject scores.
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

  const step = CHART_W / (recent.length - 1);
  const points = recent.map((e, i) => [i * step, yFor(e.mood.valence)]);
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const fillPath = `${linePath} L${points[points.length - 1][0]},${CHART_H} L0,${CHART_H} Z`;

  return (
    <div className="dash-card">
      <h2 className="heading-font">Today's Mood Trend</h2>
      <svg className="trend-chart" viewBox={`0 0 ${CHART_W} ${CHART_H + 16 + TOP_PAD}`} preserveAspectRatio="none">
        <g transform={`translate(0, ${TOP_PAD})`}>
          <path className="trend-fill" d={fillPath} />
          <path className="trend-line" d={linePath} />
          {points.map(([x, y], i) => (
            <g key={i}>
              <circle className="trend-dot" cx={x} cy={y} r="3">
                <title>{recent[i].mood.name}</title>
              </circle>
              <text className="trend-point-emoji" x={x} y={y - 6} textAnchor="middle">
                {recent[i].mood.emoji}
              </text>
            </g>
          ))}
          {recent.map((e, i) => (
            <text key={i} className="trend-axis" x={i * step} y={CHART_H + 13} textAnchor="middle">
              {e.when.split(" ").slice(-2).join(" ")}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
