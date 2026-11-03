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

// Dashboard fetches /moods, /nutrition, /alerts automatically on mount for
// any real student — those are routed separately here (always answered with
// empty history, so tests keep seeing the seed/default data) so they don't
// silently eat up slots meant for the session/check-in response sequence.
function mockFetchSequence(responses) {
  let call = 0;
  return vi.fn((url) => {
    if (typeof url === "string" && /\/(moods|nutrition|alerts)$/.test(url)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    const r = responses[Math.min(call, responses.length - 1)] || { body: {} };
    call += 1;
    return Promise.resolve({ ok: r.ok !== false, json: () => Promise.resolve(r.body) });
  });
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
    expect(screen.getByText("Good morning, Luke.")).toBeInTheDocument();
  });

  it("shows every card on the overview view", () => {
    render(<Dashboard student={student} onLogout={() => {}} />);
    expect(screen.getByText("Class Session")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mood History" })).toBeInTheDocument();
    expect(screen.getByText("Nutrition Snapshot")).toBeInTheDocument();
    expect(screen.getByText("Focus by Subject")).toBeInTheDocument();
    expect(screen.getByText("Recent Alerts to Parent")).toBeInTheDocument();
  });

  it("isolates a single card when its sidebar nav link is clicked", async () => {
    render(<Dashboard student={student} onLogout={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "Nutrition" }));

    expect(screen.getByText("Nutrition Snapshot").closest(".dash-card")).not.toHaveClass("hide");
    expect(screen.getByRole("heading", { name: "Mood History" }).closest(".dash-card")).toHaveClass("hide");
    expect(screen.getByText("Class Session").closest(".dash-card")).toHaveClass("hide");
  });

  it("starting a session creates a real backend session for a real student", async () => {
    vi.stubGlobal("fetch", mockFetchSequence([{ body: { id: 99 } }]));
    render(<Dashboard student={student} onLogout={() => {}} />);

    await userEvent.type(screen.getByLabelText(/subject/i), "Mathematics");
    await userEvent.click(screen.getByText("Start Class Session"));

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/sessions",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("does not call the backend to start a session for a guest (no real id)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<Dashboard student={guestStudent} onLogout={() => {}} />);

    await userEvent.click(screen.getByText("Start Class Session"));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks check-in for a guest and shows a message instead of calling the backend", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<Dashboard student={guestStudent} onLogout={() => {}} />);

    // Check-in now fires automatically once the camera is ready — no click
    // needed to trigger (and block) it. The real interval is 15 minutes, so
    // the test-only interval override is used to make this happen quickly.
    await userEvent.type(screen.getByLabelText(/check-in interval/i), "1");
    await userEvent.click(screen.getByText("Start Class Session"));

    expect(await screen.findByText(/sign up with email & password/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("combines 3 readings by majority vote before showing mood, nutrition, and focus score", async () => {
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

    // Check-in now fires automatically once the camera is ready — the real
    // interval is 15 minutes, so the test-only interval override (see
    // ClassSessionCard's "TESTING OVERRIDE" field) is used here instead.
    // Nothing shows until all 3 readings in the batch are collected.
    await userEvent.type(screen.getByLabelText(/check-in interval/i), "1");
    await userEvent.click(screen.getByText("Start Class Session")); // defaults subject to Mathematics

    // "🙂 Happy" alone would also match the seed/default mood shown before
    // any real check-in, so check the updated-label text instead — that only
    // changes once a real combined result lands.
    expect(await screen.findByText(/Last updated today/, {}, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByText("🙂 Happy")).toBeInTheDocument();
    // "Apple slices" appears both in the Nutrition Snapshot card and the
    // ClassSessionCard's own inline result chip — both showing it is correct.
    expect(screen.getAllByText("Apple slices").length).toBeGreaterThan(0);
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
    await userEvent.type(screen.getByLabelText(/check-in interval/i), "1");
    await userEvent.click(screen.getByText("Start Class Session"));

    expect(
      await screen.findByText(/Sad detected during Mathematics/, {}, { timeout: 6000 })
    ).toBeInTheDocument();
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
    await userEvent.type(screen.getByLabelText(/check-in interval/i), "1");
    await userEvent.click(screen.getByText("Start Class Session"));

    // Wait roughly long enough for 1-2 readings, but not all 3. The
    // updated-label text only changes once a combined result is revealed —
    // "🙂 Happy" alone isn't useful here since it's also the seed/default.
    await new Promise((r) => setTimeout(r, 1800));
    expect(screen.queryByText(/Last updated today/)).not.toBeInTheDocument();
  });

  it("calls onLogout when the sidebar logout button is clicked", async () => {
    const onLogout = vi.fn();
    render(<Dashboard student={student} onLogout={onLogout} />);
    await userEvent.click(screen.getByText("Log out"));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
