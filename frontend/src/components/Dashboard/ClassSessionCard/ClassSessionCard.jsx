import { useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { isWebcamDisabledByUser } from "../../../data/preferences";
import { foodImageUrl } from "../../../data/foodImages";
import "./ClassSessionCard.css";
import "../Overview/Overview.css";

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

// A small visual icon for the subject the student typed in — cosmetic only,
// not data from anywhere, so a sensible default (📚) covers any subject name
// that isn't in this list rather than showing nothing.
const SUBJECT_ICONS = {
  math: "🧮",
  mathematics: "🧮",
  science: "🔬",
  physics: "⚛️",
  chemistry: "🧪",
  biology: "🧬",
  english: "📖",
  history: "🏛️",
  geography: "🌍",
  art: "🎨",
  music: "🎵",
  "computer science": "💻",
  computing: "💻",
  ict: "💻",
  economics: "📈",
  "pe": "🏃",
  "physical education": "🏃",
};
function subjectIcon(subject) {
  if (!subject) return "📚";
  return SUBJECT_ICONS[subject.trim().toLowerCase()] || "📚";
}

// Real behavior: one automatic mood check-in every 15 minutes during a
// class session (matches the project proposal's periodic check-in design).
const PRODUCTION_CHECKIN_INTERVAL_SECONDS = 15 * 60;

// Neutral/Surprise have no nutrient rule, so the real rule engine returns
// every food in the dataset for them (93 foods) — real data, but far too
// many chips to usefully show at once. Capped to the first 10 for display
// only; the full real result is still what gets saved to the database.
const MAX_DISPLAYED_FOODS = 10;

// MediaPipe Pose landmark indices used for the posture check below.
const LEFT_SHOULDER = 11, RIGHT_SHOULDER = 12, LEFT_EAR = 7, RIGHT_EAR = 8;
// How close the ears are allowed to get to the shoulder line (as a fraction
// of shoulder width) before this counts as "poor" posture — e.g. slouching
// or leaning the head down toward the desk brings the ears down near
// shoulder height. This is an application-level heuristic we designed
// ourselves, not a clinical posture measurement from a research paper —
// same kind of judgment call as the rule engine's nutrient cutoffs.
const POSTURE_GAP_THRESHOLD = 0.35;

function classifyPosture(landmarks) {
  const ls = landmarks[LEFT_SHOULDER], rs = landmarks[RIGHT_SHOULDER];
  const le = landmarks[LEFT_EAR], re = landmarks[RIGHT_EAR];
  if (!ls || !rs || !le || !re) return null;
  const shoulderMidY = (ls.y + rs.y) / 2;
  const earMidY = (le.y + re.y) / 2;
  const shoulderWidth = Math.abs(ls.x - rs.x) || 0.0001;
  const normalizedGap = (shoulderMidY - earMidY) / shoulderWidth;
  return normalizedGap < POSTURE_GAP_THRESHOLD ? "poor" : "good";
}

export default function ClassSessionCard({
  hidden,
  session,
  onStart,
  onStop,
  onCheckIn,
  onPostureCheck,
  checkingIn,
  checkinError,
  result,
  batchCount = 0,
  batchSize = 1,
  onTestCheckIn,
  testCheckingIn,
  pipelineLog = [],
  testResult,
  testError,
}) {
  const [subjectInput, setSubjectInput] = useState("");
  const [duration, setDuration] = useState("60");
  const [secondsLeft, setSecondsLeft] = useState(0);
  // Only pauses the visible session-duration countdown below — the camera
  // and automatic check-ins keep running either way, same as a real short
  // break would (mood detection doesn't stop just because you paused the UI).
  const [paused, setPaused] = useState(false);
  const [secondsUntilCheckin, setSecondsUntilCheckin] = useState(0);
  const [cameraError, setCameraError] = useState("");
  // Live, continuously-updated posture reading (null until the pose model
  // has loaded and found a first clear view of shoulders/ears).
  const [postureStatus, setPostureStatus] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const stopRef = useRef(onStop);
  stopRef.current = onStop;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const checkingInRef = useRef(checkingIn);
  checkingInRef.current = checkingIn;
  const postureStatusRef = useRef(postureStatus);
  postureStatusRef.current = postureStatus;
  const onPostureCheckRef = useRef(() => {});
  onPostureCheckRef.current = onPostureCheck;
  // The recurring interval below is only set up once per session (it doesn't
  // depend on onCheckIn), so without this ref it would keep calling a stale
  // handleCheckIn closure forever — one that always saw the very first,
  // empty version of Dashboard's pendingBatch. Updating this ref on every
  // render keeps the interval calling the freshest version instead.
  const handleCheckInRef = useRef(() => {});

  useEffect(() => {
    if (!session.running) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          stopRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [session.running]);

  // Turns the webcam on for the live session view and off again when the
  // session stops or the card unmounts — the browser keeps the camera light
  // on for as long as a stream is open, so cleanup matters. Once the camera
  // is ready, it repeats a check-in automatically every real 15 minutes
  // (PRODUCTION_CHECKIN_INTERVAL_SECONDS) — the student never has to click
  // anything for the automatic monitoring to happen. (For a fast, on-demand
  // check instead of waiting, use the "Test Check-In" button below — it
  // doesn't wait for this interval at all.) A second, purely visual
  // countdown (secondsUntilCheckin) tracks the same cadence for the
  // "Next check-in" progress bar below.
  useEffect(() => {
    if (!session.running) return;
    let cancelled = false;
    let checkinTimer;
    let displayTimer;
    setCameraError("");

    // Real gate: if the student turned the Webcam Permission toggle off in
    // Settings, don't even ask the browser for the camera this session.
    if (isWebcamDisabledByUser()) {
      setCameraError("Webcam check-ins are turned off in Settings.");
      return undefined;
    }

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        setSecondsUntilCheckin(PRODUCTION_CHECKIN_INTERVAL_SECONDS);
        displayTimer = setInterval(() => {
          setSecondsUntilCheckin((prev) => (prev <= 1 ? PRODUCTION_CHECKIN_INTERVAL_SECONDS : prev - 1));
        }, 1000);

        checkinTimer = setInterval(() => {
          // Skip this tick if a previous check-in (which takes ~40s) is
          // still in flight, rather than piling up overlapping requests.
          if (!cancelled && !checkingInRef.current) handleCheckInRef.current();
          // Posture is sampled on the same cadence as mood — reports
          // whatever the live MediaPipe reading currently is.
          if (!cancelled && postureStatusRef.current) onPostureCheckRef.current(postureStatusRef.current);
        }, PRODUCTION_CHECKIN_INTERVAL_SECONDS * 1000);
      })
      .catch(() => setCameraError("Camera access denied or unavailable."));

    return () => {
      cancelled = true;
      clearInterval(checkinTimer);
      clearInterval(displayTimer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [session.running]);

  // Runs MediaPipe Pose directly in the browser on the same live video feed
  // (true continuous monitoring, per the proposal — not limited to the
  // 15-minute mood cadence). Throttled to ~2.5 checks/sec since running it
  // on every single frame isn't needed for a posture reading and would just
  // burn CPU. If the model fails to load (e.g. offline), posture simply
  // stays unavailable — mood check-in is unaffected either way.
  useEffect(() => {
    if (!session.running) return;
    let cancelled = false;
    let rafId;
    let landmarker;

    async function start() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
      });
      if (cancelled) {
        landmarker.close();
        return;
      }

      let lastCheck = 0;
      const loop = (timestampMs) => {
        if (cancelled) return;
        const video = videoRef.current;
        if (video && video.readyState >= 2 && timestampMs - lastCheck > 400) {
          lastCheck = timestampMs;
          const detection = landmarker.detectForVideo(video, timestampMs);
          const landmarks = detection.landmarks && detection.landmarks[0];
          const status = landmarks && classifyPosture(landmarks);
          if (status) setPostureStatus(status);
        }
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }

    start().catch(() => {});

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (landmarker) landmarker.close();
    };
  }, [session.running]);

  function handleStart() {
    const name = subjectInput.trim() || "Mathematics";
    setSecondsLeft(parseInt(duration, 10) * 60);
    setPaused(false);
    setPostureStatus(null);
    onStart(name, parseInt(duration, 10));
  }

  // Grabs one still frame from the live video feed and hands it off as a
  // JPEG blob to whichever real check-in flow called this (the automatic
  // batched one, or the manual test one below).
  function captureFrame(onBlob) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) onBlob(blob);
    }, "image/jpeg", 0.9);
  }

  function handleCheckIn() {
    captureFrame(onCheckIn);
  }
  handleCheckInRef.current = handleCheckIn;

  // Instant, on-demand check-in — captures a frame right now and sends it
  // to the real backend/ML pipeline, same as the automatic flow, but shows
  // the real progress live and reveals its own result immediately instead
  // of waiting on the 15-minute interval or the 3-reading batch.
  function handleTestCheckIn() {
    captureFrame(onTestCheckIn);
  }

  // Renders at most MAX_DISPLAYED_FOODS chips plus a real count of how many
  // more real foods matched, rather than overflowing the card with all of
  // them (e.g. 93 for a mood with no nutrient rule).
  function renderFoodChips(foods) {
    const shown = foods.slice(0, MAX_DISPLAYED_FOODS);
    const remaining = foods.length - shown.length;
    return (
      <>
        <div className="result-foods">
          {shown.map((food) => (
            <span key={food} className="result-food-chip">
              {foodImageUrl(food) && <img className="result-food-img" src={foodImageUrl(food)} alt="" loading="lazy" />}
              {food}
            </span>
          ))}
        </div>
        {remaining > 0 && <p className="cam-caption" style={{ marginTop: 6 }}>+{remaining} more match this mood</p>}
      </>
    );
  }

  const breakProgressPct = Math.round(
    ((PRODUCTION_CHECKIN_INTERVAL_SECONDS - secondsUntilCheckin) / PRODUCTION_CHECKIN_INTERVAL_SECONDS) * 100
  );

  return (
    <div className={"dash-card session-card" + (hidden ? " hide" : "")}>
      <h2 className="heading-font" style={{ marginBottom: 18 }}>Class Session</h2>

      {!session.running && (
        <div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="subject-input">Subject {subjectInput && <span className="subject-preview-icon">{subjectIcon(subjectInput)}</span>}</label>
              <input
                type="text"
                id="subject-input"
                placeholder="e.g. Mathematics"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="duration-input">Duration</label>
              <select id="duration-input" value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary heading-font" type="button" onClick={handleStart}>
            Start Study Session
          </button>
        </div>
      )}

      {session.running && (
        <div>
          <div className="study-session-main">
            <div className="cam-window">
              <span className="live-badge">● Live</span>
              {cameraError ? (
                <p className="cam-caption" style={{ margin: 0 }}>{cameraError}</p>
              ) : (
                <video ref={videoRef} className="cam-video" autoPlay playsInline muted />
              )}
            </div>
            <canvas ref={canvasRef} style={{ display: "none" }} />

            <div className="detected-mood-panel">
              <p className="section-label">Detected Mood</p>
              {result ? (
                <div className="detected-mood-chip" style={{ background: result.mood.bg, color: result.mood.ink }}>
                  {result.mood.emoji} {result.mood.name}
                </div>
              ) : (
                <p className="cam-caption" style={{ margin: "4px 0 0" }}>
                  {checkingIn ? "Detecting..." : "Waiting for the first check-in."}
                </p>
              )}

              <p className="section-label" style={{ marginTop: 14 }}>Posture</p>
              {postureStatus ? (
                <div className={"posture-chip posture-" + postureStatus}>
                  {postureStatus === "good" ? "🟢 Good" : "🟠 Needs adjusting"}
                </div>
              ) : (
                <p className="cam-caption" style={{ margin: "4px 0 0" }}>Detecting...</p>
              )}

              <div className="focus-tip">
                <p className="section-label" style={{ marginBottom: 4 }}>💡 Tip</p>
                <p className="cam-caption" style={{ margin: 0 }}>
                  Take a short break after each check-in and stay hydrated.
                </p>
              </div>
            </div>
          </div>

          <div className="study-timer-row">
            <div>
              <p className="section-label" style={{ marginBottom: 4 }}>
                Study Timer — {subjectIcon(session.subject)} {session.subject}
              </p>
              <p className="study-timer-display mono">{formatTime(secondsLeft)}</p>
              <p className="cam-caption" style={{ margin: "2px 0 0" }}>{paused ? "Paused" : "Stay focused!"}</p>
            </div>
            <div className="study-timer-controls">
              <button className="btn-icon" type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Resume" : "Pause"}>
                {paused ? "▶️" : "⏸️"}
              </button>
              <button className="btn-icon btn-icon-stop" type="button" onClick={onStop} aria-label="Stop Session">⏹️</button>
            </div>
            <div className="next-break">
              <p className="section-label" style={{ marginBottom: 4 }}>Next check-in in {formatTime(secondsUntilCheckin)}</p>
              <div className="weekly-progress-track">
                <div className="weekly-progress-fill" style={{ width: `${breakProgressPct}%` }} />
              </div>
            </div>
          </div>

          <p className="cam-caption" style={{ marginTop: 14 }}>
            {`Reading ${Math.min(batchCount + 1, batchSize)} of ${batchSize} — combines into one result once all ${batchSize} are in.`}
          </p>
          {checkinError && (
            <p className="cam-caption" style={{ color: "#d64545" }}>{checkinError}</p>
          )}

          {result && !checkingIn && (
            <div className="checkin-result">
              <div className="result-mood-chip" style={{ background: result.mood.bg, color: result.mood.ink }}>
                {result.mood.emoji} {result.mood.name} detected
              </div>
              {renderFoodChips(result.foods)}
            </div>
          )}

          <div className="test-checkin-block">
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleTestCheckIn}
              disabled={testCheckingIn || !!cameraError}
            >
              {testCheckingIn ? "Testing…" : "⚡ Test Check-In Now"}
            </button>
            <p className="cam-caption" style={{ margin: "6px 0 0" }}>
              Runs the real pipeline right now and shows each real step below — no waiting for the 15-minute interval.
            </p>

            {pipelineLog.length > 0 && (
              <ul className="pipeline-log">
                {pipelineLog.map((msg, i) => (
                  <li key={i} className={i === pipelineLog.length - 1 && testCheckingIn ? "pipeline-log-current" : ""}>
                    {msg}
                  </li>
                ))}
              </ul>
            )}

            {testError && <p className="cam-caption" style={{ color: "#d64545" }}>{testError}</p>}

            {testResult && !testCheckingIn && (
              <div className="checkin-result">
                <div className="result-mood-chip" style={{ background: testResult.mood.bg, color: testResult.mood.ink }}>
                  {testResult.mood.emoji} {testResult.mood.name} detected
                </div>
                {renderFoodChips(testResult.foods)}
              </div>
            )}

            <button className="btn-ghost" type="button" onClick={onStop} style={{ color: "#D6453B", marginTop: 10 }}>
              ⏹️ Stop Class Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
