import { useEffect, useRef, useState } from "react";
import logo from "../assets/logo-cropped.png";
import "./AuthFlow.css";

const SIDE_TEXT = {
  login: {
    heading: <>Know how your students feel <span className="accent-word">before it shows</span>.</>,
    text: "EduEats checks in on student mood through a quick webcam glance, then matches real nutrition data to suggest snacks that help.",
  },
  profile: {
    heading: "Let's set up your profile.",
    text: "Add your name, class, and a photo once — EduEats uses this to greet you and recognize you at check-in time.",
  },
};

const API_BASE = "http://localhost:3000";

export default function AuthFlow({ onComplete }) {
  const [step, setStep] = useState("login"); // "login" | "profile"
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null); // the real File, for uploading to the backend
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [room, setRoom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appleBlocked, setAppleBlocked] = useState(false);
  // Set once a real Google sign-in succeeds — holds the real database row
  // (id/name/email/grade/room_no) so the profile step knows to PATCH it
  // instead of running the fake local-only finish.
  const [googleStudent, setGoogleStudent] = useState(null);
  const googleButtonRef = useRef(null);
  // Tracks the page theme so the Google button (a cross-origin widget we
  // can't restyle with our own CSS) can still flip dark/light the same way
  // the Apple button does, instead of looking inconsistent with it.
  const [pageTheme, setPageTheme] = useState(
    () => document.documentElement.getAttribute("data-theme") || "light"
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setPageTheme(document.documentElement.getAttribute("data-theme") || "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Verifies the Google ID token server-side and finds/creates the matching
  // student row. A returning student with a complete profile skips straight
  // to the dashboard, same as a normal password sign-in would.
  async function handleGoogleCredential(response) {
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Google sign-in failed.");
        return;
      }
      if (data.grade && data.room_no) {
        onComplete({
          id: data.id,
          name: data.name,
          classLine: data.grade + " · Rm " + data.room_no,
          photoDataUrl: data.photo_path ? `${API_BASE}${data.photo_path}` : null,
        });
        return;
      }
      setGoogleStudent(data);
      setName(data.name);
      setStep("profile");
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Renders Google's own sign-in button once its script has loaded — a
  // custom-styled button can't trigger real Google sign-in reliably, only
  // Google's own widget can.
  useEffect(() => {
    if (step !== "login") return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        googleButtonRef.current.innerHTML = ""; // clear before re-rendering on theme change
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          // Apple's button is solid black in light mode, solid white in dark
          // mode (it inverts). Google should always be the opposite of
          // whatever Apple currently is, so the pair always reads as one
          // white + one black button, never two of the same shade.
          theme: pageTheme === "dark" ? "filled_black" : "outline",
          shape: "rectangular",
          size: "large",
          width: googleButtonRef.current.offsetWidth || 320,
          text: "continue_with",
        });
        clearInterval(id);
      } else if (attempts > 20) {
        clearInterval(id); // gave up waiting for accounts.google.com/gsi/client to load
      }
    }, 150);
    return () => clearInterval(id);
  }, [step, pageTheme]);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result);
    reader.readAsDataURL(file);
  }

  // Uploads the selected photo (if any) to the real student record once a
  // real database id exists, and returns the URL to show it from — the
  // local data: URL preview is used as a fallback if this fails.
  async function uploadPhotoIfSelected(studentId) {
    if (!photoFile) return null;
    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      const res = await fetch(`${API_BASE}/api/students/${studentId}/photo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return `${API_BASE}${data.photo_path}`;
    } catch {
      return null;
    }
  }

  // Sign In calls the backend right away; Sign Up just moves to the profile
  // step first, then creates the account once grade/room are filled in too.
  async function handleAuthSubmit() {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      return;
    }
    if (authMode === "signup") {
      if (!name.trim()) {
        setError("Enter your full name.");
        return;
      }
      setStep("profile");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed.");
        return;
      }
      onComplete({
        id: data.id,
        name: data.name,
        classLine: (data.grade || "Grade 8") + " · Rm " + (data.room_no || "214"),
        photoDataUrl: data.photo_path ? `${API_BASE}${data.photo_path}` : null,
      });
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSave() {
    setError("");

    if (!name.trim() || !grade.trim() || !room.trim()) {
      setError("Please fill in your name, grade, and room number before continuing.");
      return;
    }

    // A real Google account already has a database row (created during the
    // sign-in step) — this just fills in the grade/room it didn't have yet.
    if (googleStudent) {
      const gradeVal = grade.trim();
      const roomVal = room.trim();
      setIsSubmitting(true);
      try {
        await fetch(`${API_BASE}/api/students/${googleStudent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade: gradeVal, room_no: roomVal }),
        });
      } catch {
        // Don't block sign-in on this failing — the real id already exists.
      } finally {
        setIsSubmitting(false);
      }
      const uploadedPhotoUrl = await uploadPhotoIfSelected(googleStudent.id);
      onComplete({
        id: googleStudent.id,
        name: name.trim(),
        classLine: gradeVal + " · Rm " + roomVal,
        photoDataUrl: uploadedPhotoUrl || photoDataUrl,
      });
      return;
    }

    // The only other way to reach this step is the real Sign Up form, which
    // already validated name/email/password before getting here.
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          grade: grade.trim(),
          room_no: room.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        return;
      }
      const uploadedPhotoUrl = await uploadPhotoIfSelected(data.id);
      onComplete({
        id: data.id,
        name: data.name,
        classLine: data.grade + " · Rm " + data.room_no,
        photoDataUrl: uploadedPhotoUrl || photoDataUrl,
      });
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setIsSubmitting(false);
    }
  }

  const side = SIDE_TEXT[step];

  return (
    <div className="screen">
      <div className="side-panel">
        <div className="side-content">
          <div className="brand-logo-frame">
            <img className="brand-logo" src={logo} alt="EduEats — Intelligent Student Nutrition & Focus Support System" />
          </div>
          <div className="side-mid">
            <h1 className="heading-font">{side.heading}</h1>
            <p>{side.text}</p>
          </div>
        </div>
      </div>

      <div className="main-panel">
        <div className="card">
          <div className="brand-row">
            <div className="brand">
              <span className="brand-name heading-font">EduEats</span>
            </div>
            <div className="brand-row-right">
              <button
                className={"back-btn" + (step === "profile" ? " show" : "")}
                type="button"
                onClick={() => {
                  setStep("login");
                  setGoogleStudent(null);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
              <span className="step-tag mono">{step === "login" ? "STEP 1 OF 2" : "STEP 2 OF 2"}</span>
            </div>
          </div>

          {step === "login" && (
            <div className="step-view show">
              <h2 className="heading-font">Sign in to EduEats</h2>
              <p className="subtext">Use your school Google or Apple account — no new password to remember.</p>

              <div ref={googleButtonRef} className="google-btn-container" />

              <button
                className="oauth-btn btn-apple"
                type="button"
                onClick={() => setAppleBlocked(true)}
              >
                <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true">
                  <path fill="currentColor" d="M13.1 9.5c0-1.5.7-2.6 2-3.3-.8-1.1-2-1.8-3.6-1.9-1.5-.1-2.4.8-3.2.8-.8 0-2-.8-3.2-.8C3 4.4 1 6 1 9.3c0 1.7.4 3.4 1.1 4.7.7 1.3 1.7 2.7 2.9 2.7 1.1 0 1.6-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2.1-1.2 2.9-2.5.5-.9.9-1.8 1.1-2.8-1.5-.7-2.8-2.1-2.8-3.9zM10.1 3c.7-.8 1.1-1.9 1-3-1 .1-2.1.7-2.8 1.5-.6.7-1.1 1.8-1 2.9 1.1.1 2.1-.5 2.8-1.4z" />
                </svg>
                Continue with Apple
              </button>

              <div className="or-divider">or</div>

              <div className="auth-tabs">
                <button
                  className={"auth-tab" + (authMode === "signin" ? " active" : "")}
                  type="button"
                  onClick={() => setAuthMode("signin")}
                >
                  Sign In
                </button>
                <button
                  className={"auth-tab" + (authMode === "signup" ? " active" : "")}
                  type="button"
                  onClick={() => setAuthMode("signup")}
                >
                  Sign Up
                </button>
              </div>

              <div className="email-fields">
                <div className={"field signup-only" + (authMode === "signup" ? " show" : "")}>
                  <label htmlFor="signup-name">Full name</label>
                  <input
                    type="text"
                    id="signup-name"
                    placeholder="e.g. Luke Remingan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="login-email">Email</label>
                  <input
                    type="email"
                    id="login-email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="login-password">Password</label>
                  <input
                    type="password"
                    id="login-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <p style={{ color: "#d64545", fontSize: "0.85rem" }}>{error}</p>}
                <button
                  className="btn btn-primary heading-font"
                  type="button"
                  onClick={handleAuthSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Please wait..." : authMode === "signup" ? "Create Account" : "Sign In"}
                </button>
              </div>
            </div>
          )}

          {step === "profile" && (
            <div className="step-view show">
              <h2 className="heading-font">Set up your profile</h2>
              <p className="subtext">This only takes a minute, and you won't need to do it again.</p>

              <div className="photo-row">
                <label className="photo-circle" tabIndex={0}>
                  {photoDataUrl ? (
                    <img src={photoDataUrl} alt="Your photo" />
                  ) : (
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="9" r="3.2" stroke="var(--ink-soft)" strokeWidth="1.8" />
                      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke="var(--ink-soft)" strokeWidth="1.8" />
                    </svg>
                  )}
                  <input type="file" accept="image/*" className="photo-input" onChange={handlePhotoChange} />
                </label>
                <div className="photo-meta">
                  <div className="label">Add your photo</div>
                  <div className="hint">Click the circle to upload a clear front-facing photo.</div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="full-name">Full name</label>
                <input
                  type="text"
                  id="full-name"
                  placeholder="e.g. Luke Remingan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="grade">Grade / Class</label>
                  <input
                    type="text"
                    id="grade"
                    placeholder="e.g. Grade 8"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="room">Room no.</label>
                  <input
                    type="text"
                    id="room"
                    placeholder="e.g. 214"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                  />
                </div>
              </div>

              {error && <p style={{ color: "#d64545", fontSize: "0.85rem" }}>{error}</p>}
              <button
                className="btn btn-primary heading-font"
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Please wait..." : "Save & Continue"}
              </button>
            </div>
          )}
        </div>
      </div>

      {appleBlocked && (
        <div className="popup-overlay" onClick={() => setAppleBlocked(false)}>
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-font">Apple Sign-In unavailable</h3>
            <p>
              Apple Sign-In isn't available here — it requires a paid Apple Developer account and
              a live domain, which this local dev setup doesn't have. Please use Google or sign up
              with email.
            </p>
            <button
              className="btn btn-primary heading-font"
              type="button"
              onClick={() => setAppleBlocked(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
