import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClassSessionCard from "./ClassSessionCard";

const notRunning = { subject: null, running: false, id: null };
const running = { subject: "Mathematics", running: true, id: 7 };

const fakeStream = { getTracks: () => [{ stop: () => {} }] };

beforeEach(() => {
  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
  });
  // jsdom doesn't implement real canvas capture — stub just enough so the
  // automatic/manual check-in capture doesn't throw.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() }));
  HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob(["fake"], { type: "image/jpeg" })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ClassSessionCard", () => {
  it("shows the setup form when no session is running", () => {
    render(<ClassSessionCard hidden={false} session={notRunning} onStart={() => {}} onStop={() => {}} onCheckIn={() => {}} />);
    expect(screen.getByText("Start Study Session")).toBeInTheDocument();
  });

  it("calls onStart with the typed subject name and duration", async () => {
    const onStart = vi.fn();
    render(<ClassSessionCard hidden={false} session={notRunning} onStart={onStart} onStop={() => {}} onCheckIn={() => {}} />);

    await userEvent.type(screen.getByLabelText(/subject/i), "Physics");
    await userEvent.click(screen.getByText("Start Study Session"));

    expect(onStart).toHaveBeenCalledWith("Physics", 60);
  });

  it("defaults the subject to Mathematics when left blank", async () => {
    const onStart = vi.fn();
    render(<ClassSessionCard hidden={false} session={notRunning} onStart={onStart} onStop={() => {}} onCheckIn={() => {}} />);
    await userEvent.click(screen.getByText("Start Study Session"));
    expect(onStart).toHaveBeenCalledWith("Mathematics", 60);
  });

  it("shows the live session view with the subject name when running", () => {
    render(<ClassSessionCard hidden={false} session={running} onStart={() => {}} onStop={() => {}} onCheckIn={() => {}} />);
    expect(screen.getByText("● Live")).toBeInTheDocument();
    expect(screen.getByText(/Study Timer — Mathematics/)).toBeInTheDocument();
  });

  it("calls onStop when the stop control is clicked", async () => {
    const onStop = vi.fn();
    render(<ClassSessionCard hidden={false} session={running} onStart={() => {}} onStop={onStop} onCheckIn={() => {}} />);
    await userEvent.click(screen.getByLabelText("Stop Session"));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("pausing freezes the countdown label without stopping the session", async () => {
    render(<ClassSessionCard hidden={false} session={running} onStart={() => {}} onStop={() => {}} onCheckIn={() => {}} />);
    await userEvent.click(screen.getByLabelText("Pause"));
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByLabelText("Resume")).toBeInTheDocument();
  });

  it("shows a camera error and disables Check In Again when the camera is denied", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<ClassSessionCard hidden={false} session={running} onStart={() => {}} onStop={() => {}} onCheckIn={() => {}} />);
    expect(await screen.findByText(/camera access denied/i)).toBeInTheDocument();
    expect(screen.getByText("Check In Again")).toBeDisabled();
  });

  it("does not auto check-in right away when the real 15-minute interval is in effect", async () => {
    // session={running} directly, without going through handleStart, means
    // checkinIntervalSeconds stays at its default (the real 15 minutes) —
    // it should NOT fire almost immediately like the old behavior did.
    const onCheckIn = vi.fn();
    render(<ClassSessionCard hidden={false} session={running} onStart={() => {}} onStop={() => {}} onCheckIn={onCheckIn} />);
    await new Promise((r) => setTimeout(r, 300));
    expect(onCheckIn).not.toHaveBeenCalled();
  });

  it("repeats a check-in automatically at the testing-override interval, without needing a click", async () => {
    const onCheckIn = vi.fn();
    const onStart = vi.fn();
    const { rerender } = render(
      <ClassSessionCard hidden={false} session={notRunning} onStart={onStart} onStop={() => {}} onCheckIn={onCheckIn} />
    );

    await userEvent.type(screen.getByLabelText(/check-in interval/i), "1");
    await userEvent.click(screen.getByText("Start Study Session"));
    expect(onStart).toHaveBeenCalled();

    // Mirrors what Dashboard would do once the session actually starts.
    rerender(
      <ClassSessionCard hidden={false} session={running} onStart={onStart} onStop={() => {}} onCheckIn={onCheckIn} />
    );

    await waitFor(() => expect(onCheckIn.mock.calls.length).toBeGreaterThanOrEqual(2), { timeout: 5000 });
  });

  it("clicking Check In Again also captures and sends a frame", async () => {
    const onCheckIn = vi.fn();
    render(<ClassSessionCard hidden={false} session={running} onStart={() => {}} onStop={() => {}} onCheckIn={onCheckIn} />);
    await userEvent.click(screen.getByText("Check In Again"));
    expect(onCheckIn).toHaveBeenCalled();
  });

  it("shows the checking-in state while a check-in is in progress", () => {
    render(
      <ClassSessionCard
        hidden={false}
        session={running}
        onStart={() => {}}
        onStop={() => {}}
        onCheckIn={() => {}}
        checkingIn={true}
      />
    );
    expect(screen.getByText("Checking in...")).toBeInTheDocument();
    expect(screen.getByText("Checking in...")).toBeDisabled();
  });

  it("shows how many readings have been collected toward the combined result", () => {
    render(
      <ClassSessionCard
        hidden={false}
        session={running}
        onStart={() => {}}
        onStop={() => {}}
        onCheckIn={() => {}}
        batchCount={1}
        batchSize={3}
      />
    );
    expect(screen.getByText(/Reading 2 of 3/)).toBeInTheDocument();
  });

  it("shows a check-in error when one is passed in", () => {
    render(
      <ClassSessionCard
        hidden={false}
        session={running}
        onStart={() => {}}
        onStop={() => {}}
        onCheckIn={() => {}}
        checkinError="Check-in failed."
      />
    );
    expect(screen.getByText("Check-in failed.")).toBeInTheDocument();
  });

  it("shows the detected mood and foods once a result comes back", () => {
    const result = {
      mood: { name: "Happy", emoji: "🙂", bg: "#FBEBCB", ink: "#8A5A12" },
      foods: ["Apple slices", "Plain yogurt"],
    };
    render(
      <ClassSessionCard
        hidden={false}
        session={running}
        onStart={() => {}}
        onStop={() => {}}
        onCheckIn={() => {}}
        result={result}
      />
    );
    // "Happy detected" appears in both the Detected Mood panel and the
    // check-in result chip — both showing it is correct.
    expect(screen.getAllByText(/Happy/).length).toBeGreaterThan(0);
    expect(screen.getByText("Apple slices")).toBeInTheDocument();
    expect(screen.getByText("Plain yogurt")).toBeInTheDocument();
  });
});
