import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MoodBySubjectCard from "./MoodBySubjectCard";

const moodRows = [
  { id: 1, mood: "sad", detected_at: "2026-11-01T09:00:00.000Z", subject: "Mathematics" },
  { id: 2, mood: "sad", detected_at: "2026-11-02T09:00:00.000Z", subject: "Mathematics" },
  { id: 3, mood: "happy", detected_at: "2026-11-03T09:00:00.000Z", subject: "Mathematics" },
  { id: 4, mood: "happy", detected_at: "2026-11-01T10:00:00.000Z", subject: "Science" },
  { id: 5, mood: "neutral", detected_at: null, subject: null }, // no subject — excluded
];

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      if (url.includes("/moods")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(moodRows) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MoodBySubjectCard", () => {
  it("groups real check-ins by real subject and shows the dominant real mood for each", async () => {
    render(<MoodBySubjectCard studentId={6} />);

    expect(await screen.findByText("Mathematics")).toBeInTheDocument();
    expect(screen.getByText("Science")).toBeInTheDocument();
    // Mathematics: 2 sad, 1 happy -> dominant is Sad
    expect(screen.getByText(/😔 Sad/)).toBeInTheDocument();
    // Science: 1 happy -> dominant is Happy
    expect(screen.getByText(/🙂 Happy/)).toBeInTheDocument();
  });

  it("shows a real empty message when there are no subject-linked check-ins", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
    render(<MoodBySubjectCard studentId={6} />);
    expect(await screen.findByText("No check-ins during a class session yet.")).toBeInTheDocument();
  });
});
