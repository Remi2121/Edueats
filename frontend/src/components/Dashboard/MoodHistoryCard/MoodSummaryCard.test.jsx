import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MoodSummaryCard from "./MoodSummaryCard";

const weeks = [
  { week: 1, start: "2026-10-28", end: "2026-11-03", mood: "sad", foods: ["Banana", "Oats"] },
  { week: 2, start: "2026-10-21", end: "2026-10-27", mood: "happy", foods: ["Apple", "Carrot"] },
  { week: 3, start: "2026-10-14", end: "2026-10-20", mood: null, foods: [] },
  { week: 4, start: "2026-10-07", end: "2026-10-13", mood: null, foods: [] },
  { week: 5, start: "2026-09-30", end: "2026-10-06", mood: null, foods: [] },
];

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      if (url.includes("/mood-weeks")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(weeks) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MoodSummaryCard", () => {
  it("shows all 5 real weeks as tabs, defaulting to week 1's real mood and food", async () => {
    render(<MoodSummaryCard studentId={6} />);
    expect(await screen.findByText("Week 1")).toBeInTheDocument();
    expect(screen.getByText("Week 5")).toBeInTheDocument();
    expect(await screen.findByText(/Sad/)).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
  });

  it("switches to another week's real mood and food when clicked", async () => {
    render(<MoodSummaryCard studentId={6} />);
    await screen.findByText("Banana");

    await userEvent.click(screen.getByText("Week 2"));

    expect(await screen.findByText(/Happy/)).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.queryByText("Banana")).not.toBeInTheDocument();
  });

  it("shows a real empty message for a week with no check-ins", async () => {
    render(<MoodSummaryCard studentId={6} />);
    await screen.findByText("Banana");

    await userEvent.click(screen.getByText("Week 3"));
    expect(await screen.findByText("No check-ins that week.")).toBeInTheDocument();
  });
});
