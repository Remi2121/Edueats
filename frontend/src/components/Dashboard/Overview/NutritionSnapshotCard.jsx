import CardHead from "../shared/CardHead";
import "./Overview.css";

// Real count of foods the rule engine currently matches for the latest
// mood (after parent restrictions) — a quick glance, with the full real
// catalog one click away on My Nutrition.
export default function NutritionSnapshotCard({ snacks, onNavigate }) {
  return (
    <div className="dash-card">
      <CardHead icon="🍎" title="Nutrition snapshot" sub="A quick look at your recommendations" />
      <div className="nutrition-snapshot-row">
        <div className="nutrition-snapshot-circle">
          <b>{snacks.length}</b>
          <small>foods</small>
        </div>
        <div>
          <b className="nutrition-snapshot-headline">Personalised suggestions</b>
          <p>Based on your latest mood and parent-approved food list.</p>
          <button className="text-link" type="button" onClick={() => onNavigate("nutrition")}>
            Browse nutrition →
          </button>
        </div>
      </div>
    </div>
  );
}
