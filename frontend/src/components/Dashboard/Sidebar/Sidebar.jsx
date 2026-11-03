import logo from "../../../assets/logo-cropped.png";
import "./Sidebar.css";

const NAV_ITEMS = [
  { view: "overview", label: "Dashboard", icon: "🏠" },
  { view: "study", label: "Study Session", icon: "📚" },
  { view: "nutrition", label: "My Nutrition", icon: "🍎" },
  { view: "moodfocus", label: "Mood & Focus", icon: "😊" },
  { view: "progress", label: "My Progress", icon: "🏆" },
  { view: "settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar({ activeView, onNavigate, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          <img src={logo} alt="EduEats" />
        </div>
        <div>
          <strong className="brand-name heading-font">
            Edu<span>Eats</span>
          </strong>
          <small className="brand-tagline">Student Nutrition &amp; Focus</small>
        </div>
      </div>
      <div className="nav-caption">Student workspace</div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            className={"nav-link" + (activeView === item.view ? " active" : "")}
            type="button"
            onClick={() => onNavigate(item.view)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="growth-note">
          <b>🌱 Your daily growth</b>
          <p>Small healthy choices can make every study session better.</p>
        </div>
        {onLogout && (
          <button className="logout-btn" type="button" onClick={onLogout}>
            <span>↪</span> Log out
          </button>
        )}
      </div>
    </aside>
  );
}
