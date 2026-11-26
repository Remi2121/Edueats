import { act, render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByText(/start session/i)).toBeInTheDocument();
  });

  it("calls onStart with the selected subject and a custom duration", async () => {
    const onStart = vi.fn();
    render(<ClassSessionCard hidden={false} session={notRunning} onStart={onStart} onStop={() => {}} onCheckIn={() => {}} />);

    await userEvent.selectOptions(screen.getByLabelText(/subject/i), "Science");
    await userEvent.clear(screen.getByLabelText(/duration/i));
    await userEvent.type(screen.getByLabelText(/duration/i), "25");
    await userEvent.click(screen.getByText(/start session/i));
    await userEvent.click(screen.getByText("No — just this app"));

    expect(onStart).toHaveBeenCalledWith("Science", 25);
  });

  it("defaults the subject to Mathematics when nothing is changed", async () => {
    const onStart = vi.fn();
    render(<ClassSessionCard hidden={false} session={notRunning} onStart={onStart} onStop={() => {}} onCheckIn={() => {}} />);
    await userEvent.click(screen.getByText(/start session/i));
    await userEvent.click(screen.getByText("No — just this app"));
    expect(onStart).toHaveBeenCalledWith("Mathematics", 60);
  });

  it("shows a camera-conflict warning if the student says their camera is also on in Zoom/Meet", async () => {
    const onStart = vi.fn();
    render(<ClassSessionCard hidden={false} session={notRunning} onStart={onStart} onStop={() => {}} onCheckIn={() => {}} />);
    await userEvent.click(screen.getByText(/start session/i));
    await userEvent.click(screen.getByText("Yes, camera is on in Zoom/Meet"));
    expect(screen.getByText("One camera, one app at a time")).toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText("I have a second camera — continue"));
    expect(onStart).toHaveBeenCalledWith("Mathematics", 60);
  });

  it("shows the live session view with the subject name when running", () => {
    render(<ClassSessionCard hidden={false} session={running} onStart={() => {}} onStop={() => {}} onCheckIn={() => {}} />);
    expect(screen.getByText("● Live")).toBeInTheDocument();
    expect(screen.getByText(/🧮 Mathematics/)).toBeInTheDocument();
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

  it("shows a camera error and disables Check in again when the camera is denied", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(
      <ClassSessionCard
        hidden={false}
        session={running}
        onStart={() => {}}
        onStop={() => {}}
        onCheckIn={() => {}}
        latestMood={{ name: "Neutral", emoji: "😐", bg: "#eee", ink: "#333" }}
      />
    );
    expect(await screen.findByText(/camera access denied/i)).toBeInTheDocument();
    expect(screen.getByText(/check in again/i)).toBeDisabled();
  });

  it("does not auto check-in right away when the real 15-minute interval is in effect", async () => {
    const onCheckIn = vi.fn();
    render(<ClassSessionCard hidden={false} session={running} onStart={() => {}} onStop={() => {}} onCheckIn={onCheckIn} />);
    await new Promise((r) => setTimeout(r, 300));
    expect(onCheckIn).not.toHaveBeenCalled();
  });

  it("repeats a check-in automatically every real 15 minutes, without needing a click", async () => {
    // Only fake setInterval/clearInterval (what the check-in cadence uses) —
    // faking requestAnimationFrame too would also stall the posture effect.
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      const onCheckIn = vi.fn();
      render(<ClassSessionCard hidden={false} session={running} onStart={() => {}} onStop={() => {}} onCheckIn={onCheckIn} />);

      // let the mocked getUserMedia promise resolve and the effect run
      await act(() => vi.advanceTimersByTimeAsync(0));

      await act(() => vi.advanceTimersByTimeAsync(15 * 60 * 1000));
      expect(onCheckIn).toHaveBeenCalledTimes(1);

      await act(() => vi.advanceTimersByTimeAsync(15 * 60 * 1000));
      expect(onCheckIn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("clicking Check in again captures and sends a frame right away, no interval wait", async () => {
    const onTestCheckIn = vi.fn();
    render(
      <ClassSessionCard
        hidden={false}
        session={running}
        onStart={() => {}}
        onStop={() => {}}
        onCheckIn={() => {}}
        onTestCheckIn={onTestCheckIn}
        latestMood={{ name: "Neutral", emoji: "😐", bg: "#eee", ink: "#333" }}
      />
    );
    await userEvent.click(screen.getByText(/check in again/i));
    expect(onTestCheckIn).toHaveBeenCalled();
  });

  it("shows the checking-in state (Analyzing) while an automatic check-in is in progress, and Detecting for posture", () => {
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
    expect(screen.getByText("Analyzing…")).toBeInTheDocument();
    expect(screen.getByText("Detecting…")).toBeInTheDocument();
  });

  it("shows the Testing… label and disables the button while a test check-in is in progress", () => {
    render(
      <ClassSessionCard
        hidden={false}
        session={running}
        onStart={() => {}}
        onStop={() => {}}
        onCheckIn={() => {}}
        testCheckingIn={true}
        latestMood={{ name: "Neutral", emoji: "😐", bg: "#eee", ink: "#333" }}
      />
    );
    expect(screen.getByText("Testing…")).toBeInTheDocument();
    expect(screen.getByText("Testing…")).toBeDisabled();
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

  it("shows the test check-in's own result, separately from the automatic result", () => {
    const testResult = {
      mood: { name: "Neutral", emoji: "😐", bg: "#E5E9EC", ink: "#44535C" },
      foods: ["Apple", "Carrot"],
    };
    render(
      <ClassSessionCard
        hidden={false}
        session={running}
        onStart={() => {}}
        onStop={() => {}}
        onCheckIn={() => {}}
        testResult={testResult}
      />
    );
    expect(screen.getByText(/Neutral detected/)).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Carrot")).toBeInTheDocument();
  });

  it("shows a test check-in error separately from the automatic flow's error", () => {
    render(
      <ClassSessionCard
        hidden={false}
        session={running}
        onStart={() => {}}
        onStop={() => {}}
        onCheckIn={() => {}}
        testError="Could not reach the server."
      />
    );
    expect(screen.getByText("Could not reach the server.")).toBeInTheDocument();
  });
});
