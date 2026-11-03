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

// A simple original illustration (plant + stacked books) — not a copy of
// any stock character art, just a quiet study-corner motif for the sidebar.
function StudyCornerIllustration() {
  return (
    <svg width="92" height="78" viewBox="0 0 92 78" fill="none" aria-hidden="true">
      <rect x="14" y="58" width="64" height="8" rx="2" fill="#2A4A3E" />
      <rect x="20" y="50" width="52" height="8" rx="2" fill="#35594A" />
      <rect x="26" y="42" width="40" height="8" rx="2" fill="#416C58" />
      <circle cx="66" cy="26" r="14" fill="#1F3D33" />
      <path d="M66 14c-5 0-9 4-9 9 0 3 3 7 3 10h12c0-3 3-7 3-10 0-5-4-9-9-9z" fill="#5FE0BE" opacity="0.18" />
      <path d="M58 24c0-5 4-8 8-8M74 24c0-5-4-8-8-8" stroke="#5FE0BE" strokeWidth="2" strokeLinecap="round" />
      <path d="M62 30c2 2 6 2 8 0" stroke="#5FE0BE" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 40c0-10 6-18 6-18s6 8 6 18" stroke="#8AD65B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 22v18" stroke="#8AD65B" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

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
        <StudyCornerIllustration />
      </div>
    </aside>
  );
}
