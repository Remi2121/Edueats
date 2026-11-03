import { initials } from "../../../data/moods";
import "./Sidebar.css";

const NAV_ITEMS = [
  { view: "overview", label: "Dashboard" },
  { view: "nutrition", label: "Nutrition" },
  { view: "history", label: "Mood History" },
  { view: "alerts", label: "Alerts" },
];

export default function Sidebar({ student, activeView, onNavigate, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-name heading-font">EduEats</span>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            className={"nav-link" + (activeView === item.view ? " active" : "")}
            type="button"
            onClick={() => onNavigate(item.view)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {student.photoDataUrl ? <img src={student.photoDataUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : initials(student.name)}
          </div>
          <div>
            <div className="sidebar-user-name">{student.name}</div>
            <div className="sidebar-user-class">{student.classLine}</div>
          </div>
        </div>
        <button className="nav-link" type="button" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  );
}
