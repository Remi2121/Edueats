import { useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { isWebcamDisabledByUser } from "../../../data/preferences";
import { foodImageUrl } from "../../../data/foodImages";
import CardHead from "../shared/CardHead";
import "./ClassSessionCard.css";
import "../Overview/Overview.css";
import "../../AuthFlow.css"; // reuses the .popup-overlay/.popup-card styles already defined there

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
  latestMood,
  snacks,
  batchCount = 0,
  batchSize = 1,
  onTestCheckIn,
  testCheckingIn,
  testResult,
  testError,
}) {
  const [subjectInput, setSubjectInput] = useState("Mathematics");
  const [duration, setDuration] = useState("60");
  const [secondsLeft, setSecondsLeft] = useState(0);
  // Only pauses the visible session-duration countdown below — the camera
  // and automatic check-ins keep running either way, same as a real short
  // break would (mood detection doesn't stop just because you paused the UI).
  const [paused, setPaused] = useState(false);
  const [secondsUntilCheckin, setSecondsUntilCheckin] = useState(0);
  const [cameraError, setCameraError] = useState("");
  const ambientAudioRef = useRef(null);
  const [ambientActive, setAmbientActive] = useState(false);

  function toggleAmbientSound() {
    if (ambientActive) {
      ambientAudioRef.current?.close?.();
      ambientAudioRef.current = null;
      setAmbientActive(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02; // soothing brown noise (gentle rain)
          lastOut = data[i];
          data[i] *= 0.12;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 0.25;
        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
        ambientAudioRef.current = ctx;
        setAmbientActive(true);
      } catch {
        setAmbientActive(false);
      }
    }
  }

  useEffect(() => {
    return () => {
      ambientAudioRef.current?.close?.();
    };
  }, []);
  // Asked once before every session starts, since one webcam can only be
  // used by one app at a time — if Zoom/Meet already has it, this app's
  // camera requests will fail. Better to warn up front than let getUserMedia
  // fail silently mid-class.
  const [showZoomCheck, setShowZoomCheck] = useState(false);
  const [showCameraConflictWarning, setShowCameraConflictWarning] = useState(false);
  // Live, continuously-updated posture reading (null until the pose model
  // has loaded and found a first clear view of shoulders/ears).
  const [postureStatus, setPostureStatus] = useState(null);
  const videoRef = useRef(null);
  const camSlotRef = useRef(null); // stable spot the <video> returns to when the floating window closes
  const [pipActive, setPipActive] = useState(false);
  const pipSupported = typeof window !== "undefined" && "documentPictureInPicture" in window;
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
          stopRef.current(false); // the real countdown reached zero on its own — not an early stop
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
  // check instead of waiting, use the "Check in again" button below — it
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
      // Close the floating camera window too, if the student had popped it
      // out — otherwise it'd be left showing a dead, frozen stream.
      if (pipSupported && window.documentPictureInPicture.window) {
        window.documentPictureInPicture.window.close();
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

  function handleStartClick() {
    setShowZoomCheck(true);
  }

  function handleNotOnZoom() {
    setShowZoomCheck(false);
    handleStart();
  }

  function handleOnZoom() {
    setShowZoomCheck(false);
    setShowCameraConflictWarning(true);
  }

  function handleStart() {
    const name = subjectInput.trim() || "Mathematics";
    setSecondsLeft(parseInt(duration, 10) * 60);
    setPaused(false);
    setPostureStatus(null);
    onStart(name, parseInt(duration, 10));
  }

  // Manually clicking Finish with real time still left on the countdown
  // counts as stopping early — the backend raises a real parent alert for
  // this, distinct from the countdown simply running out on its own.
  function handleStopClick() {
    onStop(secondsLeft > 0);
  }

  // Pops the real <video> element itself (same live MediaStream, not a
  // copy) into a small always-on-top floating window via Chrome's
  // Document Picture-in-Picture API — so the camera preview can stay
  // visible while the student has another app (e.g. Zoom) focused.
  // Check-ins keep working exactly the same either way, since capturing a
  // frame just reads from videoRef.current regardless of which document it
  // currently lives in.
  async function handlePopOut() {
    if (!pipSupported || !videoRef.current) return;
    const pipWindow = await window.documentPictureInPicture.requestWindow({ width: 300, height: 230 });
    pipWindow.document.body.style.margin = "0";
    pipWindow.document.body.style.background = "#000";
    pipWindow.document.body.appendChild(videoRef.current);
    setPipActive(true);
    pipWindow.addEventListener("pagehide", () => {
      if (camSlotRef.current && videoRef.current) {
        camSlotRef.current.appendChild(videoRef.current);
      }
      setPipActive(false);
    });
  }

  // Grabs one still frame from the live video feed and hands it off as a
  // JPEG blob to whichever real check-in flow called this (the automatic
  // batched one, or the manual "Check in again" one below).
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

  // Instant, on-demand check-in — captures a fresh frame right now and
  // sends it to the real backend/ML pipeline, same as the automatic flow,
  // but reveals its own result immediately instead of waiting on the
  // 15-minute interval or the 3-reading batch. Shows a brief "photo
  // captured" confirmation the instant the frame is actually grabbed.
  const [justCaptured, setJustCaptured] = useState(false);
  // Every click captures a new real photo, since the student may be
  // testing a different expression/mood each time.
  function handleTestCheckIn() {
    captureFrame((blob) => {
      setJustCaptured(true);
      setTimeout(() => setJustCaptured(false), 2500);
      onTestCheckIn(blob);
    });
  }

  // Renders at most MAX_DISPLAYED_FOODS chips plus a real count of how many
  // more real foods matched, rather than overflowing the card with all of
  // them (e.g. 93 for a mood with no nutrient rule).
  function renderFoodChips(foods, full = false) {
    const shown = full ? foods : foods.slice(0, MAX_DISPLAYED_FOODS);
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

  // The mood-result panel always shows something — the just-detected result
  // from this session if there is one, otherwise the student's last known
  // mood from history, same as the reference app's always-populated layout.
  const shownMood = result ? result.mood : latestMood;
  const shownFoods = result ? result.foods : snacks;

  return (
    <div className={"study-layout" + (hidden ? " hide" : "")}>
      <div className="dash-card study-left">
        <div className="camera-top">
          <div>
            <h3 className="heading-font">Live camera</h3>
            <small>Camera is used only for a temporary mood check</small>
          </div>
          {pipSupported && (
            <button
              className="icon-btn"
              type="button"
              onClick={handlePopOut}
              title="Picture in Picture"
              disabled={!session.running || pipActive}
            >
              ⧉
            </button>
          )}
        </div>

        <div className="cam-window">
          {session.running && <span className="live-badge">● Live</span>}
          {session.running ? (
            cameraError ? (
              <p className="cam-caption" style={{ margin: 0 }}>{cameraError}</p>
            ) : (
              <>
                <div ref={camSlotRef} className="cam-video-slot">
                  {/* Always rendered by React, never conditionally removed — when popped
                      out, handlePopOut moves this exact DOM node into the floating
                      window imperatively, so React must never try to unmount it here. */}
                  <video ref={videoRef} className="cam-video" autoPlay playsInline muted />
                  {pipActive && (
                    <p className="cam-caption cam-pip-notice">
                      Camera preview is floating in its own window — check-ins keep working as normal.
                    </p>
                  )}
                </div>
                {checkingIn && (
                  <div className="cam-ai-target" aria-hidden="true">
                    <div className="cam-target-box">
                      <span className="cam-target-label">🌿 ANALYZING MOOD…</span>
                    </div>
                  </div>
                )}
                <div className="camtools">
                  <span title="Posture tracking active" aria-hidden="true">▣</span>
                  <span title="Audio is muted" aria-hidden="true">🔇</span>
                  <button
                    type="button"
                    className={`camtool-ambient ${ambientActive ? "active" : ""}`}
                    title={ambientActive ? "Stop calming rain sound" : "Play calming rain focus sound"}
                    aria-label={ambientActive ? "Stop calming rain sound" : "Play calming rain focus sound"}
                    onClick={toggleAmbientSound}
                  >
                    {ambientActive ? "🌧️" : "🎧"}
                  </button>
                  <button
                    type="button"
                    title="Fullscreen preview"
                    aria-label="Fullscreen preview"
                    onClick={() => videoRef.current?.requestFullscreen?.()}
                  >
                    ⛶
                  </button>
                </div>
              </>
            )
          ) : (
            <div className="camera-placeholder">
              <div className="camera-symbol" aria-hidden="true">📷</div>
              <b>Camera is paused</b>
              <span>Start a session to enable the camera</span>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="camera-foot">
          <span>
            <i className={"status-dot" + (session.running ? " on" : "")} />{" "}
            {session.running ? "Camera connected" : "Camera inactive"}
          </span>
          <span>🛡️ Images processed then discarded</span>
          {pipSupported && session.running && (
            <button className="text-link" type="button" onClick={handlePopOut}>Pop out ↗</button>
          )}
        </div>

        <div className="mood-result">
          <div className="result-head">
            <div>
              <p className="eyebrow">LATEST MOOD CHECK</p>
              <h3 className="heading-font" style={{ margin: 0 }}>How you're feeling</h3>
            </div>
            {session.running && (
              <span className="last-checked">{checkingIn ? "Analyzing…" : result ? "Just now" : "Waiting"}</span>
            )}
          </div>
          {shownMood ? (
            <div className="detected-mood">
              <div className="mood-illustration-small" style={{ background: shownMood.bg }} aria-hidden="true">
                {shownMood.emoji}
              </div>
              <div>
                <span className="mood-pill" style={{ background: shownMood.bg, color: shownMood.ink }}>
                  {shownMood.emoji} {shownMood.name}
                </span>
                <p className="cam-caption" style={{ textAlign: "left", margin: "6px 0 0" }}>
                  {shownMood.concerning
                    ? "A nourishing snack and a short reset break may help."
                    : "Keep your momentum with a balanced snack and hydration."}
                </p>
              </div>
              <button
                className="btn-outline"
                type="button"
                onClick={handleTestCheckIn}
                disabled={!session.running || testCheckingIn || !!cameraError}
              >
                {testCheckingIn ? "Testing…" : "🔄 Check in again"}
              </button>
            </div>
          ) : (
            <p className="cam-caption" style={{ textAlign: "left" }}>No mood check-ins yet — start a session to begin.</p>
          )}
          {justCaptured && (
            <p className="cam-caption" style={{ textAlign: "left", color: "var(--accent)", fontWeight: 600, marginTop: 8 }}>
              📸 Photo captured — running the real pipeline now…
            </p>
          )}
          {testError && <p className="cam-caption" style={{ textAlign: "left", color: "#d64545" }}>{testError}</p>}
          {testResult && !testCheckingIn && (
            <div className="checkin-result" style={{ textAlign: "left", marginTop: 10 }}>
              <div className="result-mood-chip" style={{ background: testResult.mood.bg, color: testResult.mood.ink }}>
                {testResult.mood.emoji} {testResult.mood.name} detected
              </div>
              {renderFoodChips(testResult.foods, true)}
            </div>
          )}
        </div>

        <div className="recommend-under">
          <CardHead icon="🍎" title="Food suggestions" sub="Matched to your latest mood · Parent-approved only" />
          {shownFoods && shownFoods.length ? (
            renderFoodChips(shownFoods)
          ) : (
            <p className="cam-caption" style={{ textAlign: "left" }}>No available items. Ask your parent to review food restrictions.</p>
          )}
        </div>
      </div>

      <div className="study-right">
        <div className="dash-card timer-panel">
          <CardHead icon="⏱️" title="Study timer" sub="Your focused study time" />
          <p className="big-timer">{session.running ? formatTime(secondsLeft) : "00:00"}</p>
          <p className="timer-status">
            <i className={session.running && !paused ? "pulse" : ""} />
            {session.running ? (paused ? "Paused" : "Timer is running") : "Ready to begin"}
            {session.running && <span> · {subjectIcon(session.subject)} {session.subject}</span>}
          </p>

          {!session.running && (
            <>
              <label htmlFor="subject-input">
                Study subject {subjectInput && <span className="subject-preview-icon">{subjectIcon(subjectInput)}</span>}
              </label>
              <select id="subject-input" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)}>
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science</option>
                <option value="English">English</option>
                <option value="History">History</option>
                <option value="Other">Other</option>
              </select>
              <label htmlFor="duration-input">Duration (minutes)</label>
              <input
                id="duration-input"
                type="number"
                min="1"
                max="300"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </>
          )}

          <button
            className="btn btn-primary full heading-font"
            type="button"
            aria-label={session.running ? "Stop Session" : "Start Session"}
            onClick={session.running ? handleStopClick : handleStartClick}
          >
            {session.running ? "⏸ Finish session" : "▶ Start session"}
          </button>
          {session.running && (
            <button
              className="btn-ghost full"
              type="button"
              aria-label={paused ? "Resume" : "Pause"}
              onClick={() => setPaused((p) => !p)}
              style={{ marginTop: 8 }}
            >
              {paused ? "▶️ Resume" : "⏸️ Pause"}
            </button>
          )}
        </div>

        {session.running && (
          <div className="dash-card">
            <p className="section-label" style={{ marginBottom: 4 }}>Next check-in in {formatTime(secondsUntilCheckin)}</p>
            <div className="weekly-progress-track"><div className="weekly-progress-fill" style={{ width: `${breakProgressPct}%` }} /></div>
            <p className="cam-caption" style={{ marginTop: 10 }}>
              {`Reading ${Math.min(batchCount + 1, batchSize)} of ${batchSize} — combines into one result once all ${batchSize} are in.`}
            </p>
            {checkinError && <p className="cam-caption" style={{ color: "#d64545" }}>{checkinError}</p>}
            <p className="section-label" style={{ marginTop: 14, marginBottom: 4 }}>Posture</p>
            {postureStatus ? (
              <div className={"posture-chip posture-" + postureStatus}>
                {postureStatus === "good" ? "🟢 Good" : "🟠 Needs adjusting"}
              </div>
            ) : (
              <p className="cam-caption">Detecting…</p>
            )}
          </div>
        )}

        <div className="dash-card privacy-panel">
          <div className="privacy-heading">🛡️ <b>Your privacy matters</b></div>
          <p>Camera frames are temporarily processed for mood analysis. The captured image is discarded after processing.</p>
          <div className="privacy-points">
            <span>✓ No face-photo gallery</span>
            <span>✓ No saved face images</span>
            <span>✓ In-app mood history only</span>
          </div>
        </div>

        <div className="dash-card session-tip">
          <span className="tip-icon" aria-hidden="true">☕</span>
          <div>
            <b>Remember to take a break</b>
            <p>A short pause can help you return to your work refreshed.</p>
          </div>
        </div>
      </div>

      {showZoomCheck && (
        <div className="popup-overlay" onClick={() => setShowZoomCheck(false)}>
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-font">Quick check before you start</h3>
            <p>Will your camera also be on in Zoom, Google Meet, or another video call during this class?</p>
            <button className="btn btn-primary heading-font" type="button" onClick={handleNotOnZoom}>
              No — just this app
            </button>
            <button className="btn btn-ghost" type="button" onClick={handleOnZoom}>
              Yes, camera is on in Zoom/Meet
            </button>
          </div>
        </div>
      )}

      {showCameraConflictWarning && (
        <div className="popup-overlay" onClick={() => setShowCameraConflictWarning(false)}>
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-font">One camera, one app at a time</h3>
            <p>
              A single webcam can only be used by one app at a time. Since Zoom/Meet already has
              it, this app's mood check-ins won't be able to open the camera too — you'll need a
              second/external webcam for both to work during the same class.
            </p>
            <button
              className="btn btn-primary heading-font"
              type="button"
              onClick={() => {
                setShowCameraConflictWarning(false);
                handleStart();
              }}
            >
              I have a second camera — continue
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowCameraConflictWarning(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
