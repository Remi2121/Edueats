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
    expect(screen.getByText(/Study Timer — 🧮 Mathematics/)).toBeInTheDocument();
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

  it("shows a camera error and disables Test Check-In Now when the camera is denied", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<ClassSessionCard hidden={false} session={running} onStart={() => {}} onStop={() => {}} onCheckIn={() => {}} />);
    expect(await screen.findByText(/camera access denied/i)).toBeInTheDocument();
    expect(screen.getByText("⚡ Test Check-In Now")).toBeDisabled();
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

  it("clicking Test Check-In Now captures and sends a frame right away, no interval wait", async () => {
    const onTestCheckIn = vi.fn();
    render(
      <ClassSessionCard
        hidden={false}
        session={running}
        onStart={() => {}}
        onStop={() => {}}
        onCheckIn={() => {}}
        onTestCheckIn={onTestCheckIn}
      />
    );
    await userEvent.click(screen.getByText("⚡ Test Check-In Now"));
    expect(onTestCheckIn).toHaveBeenCalled();
  });

  it("shows the checking-in state in the Detected Mood panel while an automatic check-in is in progress", () => {
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
    // "Detecting..." shows for both mood and posture until each resolves —
    // both appearing is correct, not a duplicate bug.
    expect(screen.getAllByText("Detecting...").length).toBeGreaterThan(0);
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

  it("shows the real pipeline stages live as they stream in from a test check-in", () => {
    render(
      <ClassSessionCard
        hidden={false}
        session={running}
        onStart={() => {}}
        onStop={() => {}}
        onCheckIn={() => {}}
        testCheckingIn={true}
        pipelineLog={["Backend received the photo, starting mood detection", "Face detected, cropped to just the face"]}
      />
    );
    expect(screen.getByText("Backend received the photo, starting mood detection")).toBeInTheDocument();
    expect(screen.getByText("Face detected, cropped to just the face")).toBeInTheDocument();
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
