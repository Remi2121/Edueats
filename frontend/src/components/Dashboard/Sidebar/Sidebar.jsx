import logo from "../../../assets/logo-cropped.png";
import { t } from "../../../data/i18n";
import { initials } from "../../../data/moods";
import "./Sidebar.css";

const NAV_GROUPS = [
  {
    label: "STUDENT SPACE",
    items: [
      { view: "overview", label: "Dashboard", icon: "🏠" },
      { view: "study", label: "Study Session", icon: "📚" },
      { view: "nutrition", label: "My Nutrition", icon: "🍎" },
      { view: "moodfocus", label: "Mood & Focus", icon: "😊" },
      { view: "progress", label: "My Progress", icon: "🏆" },
    ],
  },
  {
    label: "PREFERENCES",
    items: [{ view: "settings", label: "Settings", icon: "⚙️" }],
  },
];

const NAV_LOCALIZED = {
  overview: { en: "Dashboard", ta: "முகப்பு", si: "ප්‍රධාන පිටුව" },
  study: { en: "Study Session", ta: "படிப்பு நேரம்", si: "අධ්‍යයන සැසිය" },
  nutrition: { en: "My Nutrition", ta: "என் ஊட்டச்சத்து", si: "මගේ පෝෂණය" },
  moodfocus: { en: "Mood & Focus", ta: "மனநிலை & கவனம்", si: "මනෝභාවය & අවධානය" },
  progress: { en: "My Progress", ta: "என் முன்னேற்றம்", si: "මගේ ප්‍රගතිය" },
  settings: { en: "Settings", ta: "அமைப்புகள்", si: "සැකසුම්" },
};

export default function Sidebar({ activeView, onNavigate, onLogout, lang = "en", student }) {
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
          <small className="brand-tagline">{t("brandTagline", lang)}</small>
        </div>
      </div>

      {student && (
        <div className="profile-mini">
          <div className="profile-mini-avatar">
            {student.photoDataUrl ? <img src={student.photoDataUrl} alt="" /> : initials(student.name)}
          </div>
          <div className="profile-mini-copy">
            <b>{student.name}</b>
            <small>Student account</small>
          </div>
        </div>
      )}

      {NAV_GROUPS.map((group) => (
        <div className="nav-group" key={group.label}>
          <div className="nav-caption">{group.label === "STUDENT SPACE" ? t("navHeader", lang) : group.label}</div>
          <nav className="nav">
            {group.items.map((item) => {
              const displayLabel = lang === "en" ? item.label : (NAV_LOCALIZED[item.view]?.[lang] || item.label);
              return (
                <button
                  key={item.view}
                  className={"nav-link" + (activeView === item.view ? " active" : "")}
                  type="button"
                  onClick={() => onNavigate(item.view)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {displayLabel}
                </button>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="sidebar-bottom">
        <div className="privacy-mini">
          <span aria-hidden="true">🛡️</span>
          <div>
            <b>Privacy first</b>
            <small>Face images aren't stored</small>
          </div>
        </div>
        {onLogout && (
          <button className="logout-btn" type="button" onClick={onLogout}>
            <span>↪</span> {t("logout", lang)}
          </button>
        )}
        <div className="sidebar-foot">© 2026 EduEats <span>v1.0.0</span></div>
      </div>
    </aside>
  );
}
