import "./ThemeToggle.css";

export default function ThemeToggle({ theme, onToggle, onDashboard }) {
  const isDark = theme === "dark";
  return (
    <button
      className={"theme-toggle" + (onDashboard ? " on-dashboard" : "")}
      type="button"
      aria-label="Switch between light and dark mode"
      onClick={onToggle}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
        </svg>
      )}
    </button>
  );
}
