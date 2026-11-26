import logo from "../../../assets/logo-cropped.png";
import { t } from "../../../data/i18n";
import "./Sidebar.css";

const NAV_ITEMS = [
  { view: "overview", label: "Dashboard", icon: "🏠" },
  { view: "study", label: "Study Session", icon: "📚" },
  { view: "nutrition", label: "My Nutrition", icon: "🍎" },
  { view: "moodfocus", label: "Mood & Focus", icon: "😊" },
  { view: "progress", label: "My Progress", icon: "🏆" },
  { view: "settings", label: "Settings", icon: "⚙️" },
];

const NAV_LOCALIZED = {
  overview: { en: "Dashboard", ta: "முகப்பு", si: "ප්‍රධාන පිටුව" },
  study: { en: "Study Session", ta: "படிப்பு நேரம்", si: "අධ්‍යයන සැසිය" },
  nutrition: { en: "My Nutrition", ta: "என் ஊட்டச்சத்து", si: "මගේ පෝෂණය" },
  moodfocus: { en: "Mood & Focus", ta: "மனநிலை & கவனம்", si: "මනෝභාවය & අවධානය" },
  progress: { en: "My Progress", ta: "என் முன்னேற்றம்", si: "මගේ ප්‍රගතිය" },
  settings: { en: "Settings", ta: "அமைப்புகள்", si: "සැකසුම්" },
};

export default function Sidebar({ activeView, onNavigate, onLogout, lang = "en" }) {
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
      <div className="nav-caption">{t("navHeader", lang)}</div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => {
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
      <div className="sidebar-bottom">
        <div className="growth-note">
          <b>{t("growthTitle", lang)}</b>
          <p>{t("growthDesc", lang)}</p>
        </div>
        {onLogout && (
          <button className="logout-btn" type="button" onClick={onLogout}>
            <span>↪</span> {t("logout", lang)}
          </button>
        )}
      </div>
    </aside>
  );
}
