import logo from "../../../assets/logo-cropped.png";
import "./Sidebar.css";

function Icon({ d }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  overview: "M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9",
  study: "M10 8l6 4-6 4V8zM3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z",
  nutrition: "M12 7c-2-3-6-3-7 0-1 3 1 7 7 11 6-4 8-8 7-11-1-3-5-3-7 0zM12 7V4",
  moodfocus: "M8 10h.01M16 10h.01M8 15c1.2 1.2 2.6 1.8 4 1.8s2.8-.6 4-1.8M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  progress: "M4 20V11M12 20V4M20 20v-7",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 17.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.65 13 1.7 1.7 0 0 0 3.09 12H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 7a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 2.65 1.7 1.7 0 0 0 10.09 1.1V1a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 2.65a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.35 7a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 13z",
};

const NAV_ITEMS = [
  { view: "overview", label: "Dashboard" },
  { view: "study", label: "Study Session" },
  { view: "nutrition", label: "My Nutrition" },
  { view: "moodfocus", label: "Mood & Focus" },
  { view: "progress", label: "My Progress" },
  { view: "settings", label: "Settings" },
];

export default function Sidebar({ activeView, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-name heading-font">EduEats</span>
        <span className="brand-tagline">Student Nutrition & Focus Support</span>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            className={"nav-link" + (activeView === item.view ? " active" : "")}
            type="button"
            onClick={() => onNavigate(item.view)}
          >
            <Icon d={ICONS[item.view]} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-illustration">
        <img className="sidebar-logo" src={logo} alt="EduEats" />
      </div>
    </aside>
  );
}
