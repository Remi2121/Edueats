import "./NutritionCard.css";

export default function NutritionCard({ hidden, focused, snacks }) {
  return (
    <div className={"dash-card" + (hidden ? " hide" : "") + (focused ? " focused" : "")}>
      <h2 className="heading-font">Nutrition Snapshot</h2>
      <p className="section-label">Suggested from today's menu</p>
      <div className="snacks">
        {snacks.map((s) => (
          <span key={s} className="snack">{s}</span>
        ))}
      </div>
      <p className="hydration-note">💧 Water reminder: 3 of 6 breaks logged today</p>
    </div>
  );
}
