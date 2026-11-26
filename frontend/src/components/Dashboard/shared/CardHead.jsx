import "./CardHead.css";

export default function CardHead({ icon, title, sub, action }) {
  return (
    <div className="card-head-row">
      <span className="card-head-icon" aria-hidden="true">{icon}</span>
      <div className="card-head-copy">
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action && <div className="card-head-action">{action}</div>}
    </div>
  );
}
