import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

// Students signed up through Google/Apple/local-only have no real database
// row (id: null) — real check-in is blocked for them. Most tests use a real
// id so the fetch-backed paths (session creation, check-in) run normally.
const student = { id: 42, name: "Luke Remingan", classLine: "Grade 8 · Rm 214", photoDataUrl: null };
const guestStudent = { id: null, name: "Luke Remingan", classLine: "Grade 8 · Rm 214", photoDataUrl: null };

const fakeStream = { getTracks: () => [{ stop: () => {} }] };

// Dashboard fetches /moods, /nutrition, /alerts, /focus, /sessions/today
// automatically on mount for any real student — those are routed separately
// here (always answered with empty history) so they don't silently eat up
// slots meant for the session/check-in response sequence.
function mockFetchSequence(responses) {
  let call = 0;
  return vi.fn((url, options) => {
    if (typeof url === "string" && /\/(moods|nutrition|alerts|focus)$/.test(url)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (typeof url === "string" && url.endsWith("/sessions/today")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ totalMinutes: 0, sessions: [] }) });
    }
    if (typeof url === "string" && url.includes("/sessions/week")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (typeof url === "string" && /\/sessions\/\d+\/end$/.test(url)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    const r = responses[Math.min(call, responses.length - 1)] || { body: {} };
    call += 1;
    return Promise.resolve({ ok: r.ok !== false, json: () => Promise.resolve(r.body) });
  });
}

async function goToStudySession() {
  await userEvent.click(screen.getByText("Study Session"));
}

beforeEach(() => {
  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
  });
  // jsdom doesn't implement real canvas capture — stub just enough so the
  // automatic check-in produces a fake photo blob like a real browser would.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() }));
  HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob(["fake"], { type: "image/jpeg" })));
  // Default fetch stub so tests that don't care about network calls (and
  // never override this) don't make a real request to localhost:3000 just
  // because Dashboard loads history on mount for a real student.id.
  vi.stubGlobal("fetch", mockFetchSequence([]));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Dashboard (integration)", () => {
  it("greets the student by first name", () => {
    render(<Dashboard student={student} onLogout={() => {}} />);
    expect(screen.getByText("Hi, Luke! 👋")).toBeInTheDocument();
  });

  it("shows the overview summary, not the full cards", () => {
    render(<Dashboard student={student} onLogout={() => {}} />);
    expect(screen.getByText("Current Mood")).toBeInTheDocument();
    expect(screen.getByText("Today's Recommendation")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Study's Summary")).toBeInTheDocument();
    // The full Nutrition/Mood History/Focus/Alerts pages only show on their
    // own dedicated nav views now, not bundled into the overview.
    expect(screen.queryByRole("heading", { name: "My Nutrition" })).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Alerts to Parent")).not.toBeInTheDocument();
  });

  it("Study Session nav shows the live class session card", async () => {
    render(<Dashboard student={student} onLogout={() => {}} />);
    await goToStudySession();
    expect(screen.getByText("Class Session").closest(".dash-card")).not.toHaveClass("hide");
  });

  it("My Nutrition nav shows the nutrition card", async () => {
    render(<Dashboard student={student} onLogout={() => {}} />);
    await userEvent.click(screen.getByText("My Nutrition"));
    expect(screen.getByRole("heading", { name: "My Nutrition" })).toBeInTheDocument();
  });

  it("Mood & Focus nav shows mood history and alerts together", async () => {
    render(<Dashboard student={student} onLogout={() => {}} />);
    await userEvent.click(screen.getByText("Mood & Focus"));
    expect(screen.getByRole("heading", { name: "Mood History" })).toBeInTheDocument();
    expect(screen.getByText("Recent Alerts to Parent")).toBeInTheDocument();
  });

  it("My Progress nav shows focus by subject", async () => {
    render(<Dashboard student={student} onLogout={() => {}} />);
    await userEvent.click(screen.getByText("My Progress"));
    expect(screen.getByText("Focus by Subject")).toBeInTheDocument();
  });

  it("Settings nav shows the settings panel with a working theme toggle", async () => {
    const onToggleTheme = vi.fn();
    render(<Dashboard student={student} onLogout={() => {}} theme="light" onToggleTheme={onToggleTheme} />);
    await userEvent.click(screen.getByText("Settings"));
    expect(screen.getByText("Theme")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Theme"));
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });

  it("starting a session creates a real backend session for a real student", async () => {
    vi.stubGlobal("fetch", mockFetchSequence([{ body: { id: 99 } }]));
    render(<Dashboard student={student} onLogout={() => {}} />);
    await goToStudySession();

    await userEvent.type(screen.getByLabelText(/subject/i), "Mathematics");
    await userEvent.click(screen.getByText("Start Study Session"));

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/sessions",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("ending a session marks it finished on the backend", async () => {
    vi.stubGlobal("fetch", mockFetchSequence([{ body: { id: 99 } }]));
    render(<Dashboard student={student} onLogout={() => {}} />);
    await goToStudySession();

    await userEvent.click(screen.getByText("Start Study Session"));
    await screen.findByLabelText("Stop Session");
    await userEvent.click(screen.getByLabelText("Stop Session"));

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/sessions/99/end",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("does not call the backend to start a session for a guest (no real id)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<Dashboard student={guestStudent} onLogout={() => {}} />);
    await goToStudySession();

    await userEvent.click(screen.getByText("Start Study Session"));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks check-in for a guest and shows a message instead of calling the backend", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<Dashboard student={guestStudent} onLogout={() => {}} />);
    await goToStudySession();

    // Check-in now fires automatically once the camera is ready — no click
    // needed to trigger (and block) it. The real interval is 15 minutes, so
    // the test-only interval override is used to make this happen quickly.
    await userEvent.type(screen.getByLabelText(/check-in interval/i), "1");
    await userEvent.click(screen.getByText("Start Study Session"));

    expect(await screen.findByText(/sign up with email & password/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("combines 3 readings by majority vote before revealing a result", async () => {
    // 3 real readings (each ticking on the 1s test interval) need more than
    // vitest's default 5s per-test timeout.
    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        { body: { id: 99 } }, // POST /api/sessions
        { body: { mood_id: 1, mood: "happy", foods: ["Apple slices", "Plain yogurt"] } }, // POST /api/checkin (reused for all 3 readings)
      ])
    );
    render(<Dashboard student={student} onLogout={() => {}} />);
    await goToStudySession();

    await userEvent.type(screen.getByLabelText(/check-in interval/i), "1");
    await userEvent.click(screen.getByText("Start Study Session")); // defaults subject to Mathematics

    expect(await screen.findByText(/Happy detected/, {}, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByText("Apple slices")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Mood & Focus"));
    expect(screen.getByText("No alerts sent yet today.")).toBeInTheDocument();
  }, 10000);

  it("logs a concerning mood as a parent alert once the 3-reading batch combines to one", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        { body: { id: 99 } },
        { body: { mood_id: 1, mood: "sad", foods: ["Almonds", "Banana", "Oats"] } },
      ])
    );
    render(<Dashboard student={student} onLogout={() => {}} />);
    await goToStudySession();
    await userEvent.type(screen.getByLabelText(/check-in interval/i), "1");
    await userEvent.click(screen.getByText("Start Study Session"));

    await screen.findByText(/Sad detected/, {}, { timeout: 6000 });
    await userEvent.click(screen.getByText("Mood & Focus"));
    expect(screen.getByText(/Sad detected during Mathematics/)).toBeInTheDocument();
  }, 10000);

  it("does not reveal a result after only 1 or 2 of the 3 readings", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        { body: { id: 99 } },
        { body: { mood_id: 1, mood: "happy", foods: ["Apple slices"] } },
      ])
    );
    render(<Dashboard student={student} onLogout={() => {}} />);
    await goToStudySession();
    await userEvent.type(screen.getByLabelText(/check-in interval/i), "1");
    await userEvent.click(screen.getByText("Start Study Session"));

    // Wait roughly long enough for 1-2 readings, but not all 3.
    await new Promise((r) => setTimeout(r, 1800));
    expect(screen.queryByText(/Happy detected/)).not.toBeInTheDocument();
  });

  it("calls onLogout when Log Out is clicked on the Settings page", async () => {
    const onLogout = vi.fn();
    render(<Dashboard student={student} onLogout={onLogout} />);
    await userEvent.click(screen.getByText("Settings"));
    await userEvent.click(screen.getByText("Log Out"));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
