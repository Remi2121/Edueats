import { useEffect, useRef, useState } from "react";
import "./ClassSessionCard.css";

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

// Real behavior: one automatic mood check-in every 15 minutes during a
// class session (matches the project proposal's periodic check-in design).
const PRODUCTION_CHECKIN_INTERVAL_SECONDS = 15 * 60;

function formatInterval(seconds) {
  if (seconds < 60) return `${seconds} sec`;
  return `${Math.round(seconds / 60)} min`;
}

export default function ClassSessionCard({
  hidden,
  session,
  onStart,
  onStop,
  onCheckIn,
  checkingIn,
  checkinError,
  result,
  batchCount = 0,
  batchSize = 1,
}) {
  const [subjectInput, setSubjectInput] = useState("");
  const [duration, setDuration] = useState("60");
  // TESTING OVERRIDE — lets us test without waiting the real 15 minutes.
  // Remove this field (and just use PRODUCTION_CHECKIN_INTERVAL_SECONDS
  // directly) before final submission.
  const [testIntervalInput, setTestIntervalInput] = useState("");
  const [checkinIntervalSeconds, setCheckinIntervalSeconds] = useState(PRODUCTION_CHECKIN_INTERVAL_SECONDS);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const stopRef = useRef(onStop);
  stopRef.current = onStop;
  const checkingInRef = useRef(checkingIn);
  checkingInRef.current = checkingIn;
  // The recurring interval below is only set up once per session (it doesn't
  // depend on onCheckIn), so without this ref it would keep calling a stale
  // handleCheckIn closure forever — one that always saw the very first,
  // empty version of Dashboard's pendingBatch. Updating this ref on every
  // render keeps the interval calling the freshest version instead.
  const handleCheckInRef = useRef(() => {});

  useEffect(() => {
    if (!session.running) return;
    const id = setInterval(() => {
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
  // is ready, it repeats a check-in automatically every
  // `checkinIntervalSeconds` (15 real minutes in production, or the
  // TESTING OVERRIDE value above) — the student never has to click
  // anything for check-ins to happen.
  useEffect(() => {
    if (!session.running) return;
    let cancelled = false;
    let checkinTimer;
    setCameraError("");

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        checkinTimer = setInterval(() => {
          // Skip this tick if a previous check-in (which takes ~40s) is
          // still in flight, rather than piling up overlapping requests.
          if (!cancelled && !checkingInRef.current) handleCheckInRef.current();
        }, checkinIntervalSeconds * 1000);
      })
      .catch(() => setCameraError("Camera access denied or unavailable."));

    return () => {
      cancelled = true;
      clearInterval(checkinTimer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [session.running, checkinIntervalSeconds]);

  function handleStart() {
    const name = subjectInput.trim() || "Mathematics";
    setSecondsLeft(parseInt(duration, 10) * 60);
    // TESTING OVERRIDE — see the field/state declarations above.
    const testSeconds = parseInt(testIntervalInput, 10);
    setCheckinIntervalSeconds(testSeconds > 0 ? testSeconds : PRODUCTION_CHECKIN_INTERVAL_SECONDS);
    onStart(name, parseInt(duration, 10));
  }

  // Grabs one still frame from the live video feed and hands it to the
  // backend's /api/checkin endpoint as a JPEG blob.
  function handleCheckIn() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) onCheckIn(blob);
    }, "image/jpeg", 0.9);
  }
  handleCheckInRef.current = handleCheckIn;

  return (
    <div className={"dash-card session-card" + (hidden ? " hide" : "")}>
      <div className="card-head">
        <h2 className="heading-font">Class Session</h2>
        <span className={"badge" + (session.running ? " live" : "")}>
          {session.running ? "Live" : "Not running"}
        </span>
      </div>

      {!session.running && (
        <div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="subject-input">Subject</label>
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
          {/* TESTING OVERRIDE — remove this field before final submission. */}
          <div className="field-row">
            <div className="field">
              <label htmlFor="test-interval-input">Check-in interval (sec) — testing only</label>
              <input
                type="number"
                id="test-interval-input"
                placeholder="blank = real 15 min"
                min="1"
                value={testIntervalInput}
                onChange={(e) => setTestIntervalInput(e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-primary heading-font" type="button" onClick={handleStart}>
            Start Class Session
          </button>
        </div>
      )}

      {session.running && (
        <div>
          <div className="session-live-top">
            <div>
              <span className="subject-name">{session.subject}</span>
              <span className="session-timer mono">{formatTime(secondsLeft)}</span>
            </div>
            <button className="btn-ghost" type="button" onClick={onStop}>Stop Session</button>
          </div>

          <div className="cam-window">
            {cameraError ? (
              <p className="cam-caption" style={{ margin: 0 }}>{cameraError}</p>
            ) : (
              <video ref={videoRef} className="cam-video" autoPlay playsInline muted />
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />

          <p className="cam-caption">
            {checkingIn
              ? "Detecting mood... this takes about 40 seconds (the model is cold-starting)."
              : `Mood check-in happens automatically every ${formatInterval(checkinIntervalSeconds)} — click below to check in sooner.`}
          </p>
          <p className="cam-caption">
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
              <div className="result-foods">
                {result.foods.map((food) => (
                  <span key={food} className="result-food-chip">{food}</span>
                ))}
              </div>
            </div>
          )}

          <button
            className="btn-ghost"
            type="button"
            onClick={handleCheckIn}
            disabled={checkingIn || !!cameraError}
          >
            {checkingIn ? "Checking in..." : "Check In Again"}
          </button>
        </div>
      )}
    </div>
  );
}
