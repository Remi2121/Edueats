import { useEffect, useState } from "react";
import ThemeToggle from "./components/ThemeToggle";
import AuthFlow from "./components/AuthFlow";
import Dashboard from "./components/Dashboard/Dashboard";

// Remembers the signed-in student in this browser so reopening the app
// (same tab, new tab, or after a refresh) lands straight on the dashboard
// instead of asking to sign in again.
const STORAGE_KEY = "edueats_student";

function loadSavedStudent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [theme, setTheme] = useState("light");
  const [student, setStudent] = useState(loadSavedStudent);
  const [screen, setScreen] = useState(student ? "dashboard" : "auth"); // "auth" | "dashboard"

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function handleAuthComplete(newStudent) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStudent));
    setStudent(newStudent);
    setScreen("dashboard");
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setStudent(null);
    setScreen("auth");
  }

  return (
    <>
      <ThemeToggle
        theme={theme}
        onToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onDashboard={screen === "dashboard"}
      />
      {screen === "auth" && <AuthFlow onComplete={handleAuthComplete} />}
      {screen === "dashboard" && student && (
        <Dashboard
          student={student}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        />
      )}
    </>
  );
}
