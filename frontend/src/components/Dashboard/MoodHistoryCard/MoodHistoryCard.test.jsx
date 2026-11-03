import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MoodHistoryCard from "./MoodHistoryCard";

const historyRow = {
  mood_id: 1,
  mood: "sad",
  detected_at: new Date().toISOString(), // today, so it's selected by default
  subject: "Mathematics",
  foods: ["Banana", "Oats"],
};

function mockFetchImpl(url) {
  if (url.includes("/nutrition-history")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve([historyRow]) });
  }
  if (url.includes("/mood-rules")) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          rules: { sad: ["high_magnesium_mg", "high_vitamin_b_mg"] },
          medians: { magnesium_mg: 21, vitamin_b_mg: 0.09 },
        }),
    });
  }
  if (url.includes("/api/foods/")) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          food_name: "Banana",
          calories: 89,
          fat_g: 0.3,
          sugar_g: 12,
          water_ml: 75,
          magnesium_mg: 27,
          vitamin_b_mg: 0.4,
        }),
    });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(mockFetchImpl));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MoodHistoryCard", () => {
  it("loads real mood + food history and defaults the date picker to the most recent real date", async () => {
    render(<MoodHistoryCard hidden={false} studentId={6} />);
    expect(await screen.findByText(/Sad — Mathematics/)).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.getByText("Oats")).toBeInTheDocument();
  });

  it("shows a food's real nutrients and a plain-language rule explanation when clicked", async () => {
    render(<MoodHistoryCard hidden={false} studentId={6} />);
    await screen.findByText("Banana");

    await userEvent.click(screen.getByText("Banana"));

    await waitFor(() => expect(screen.getByText(/Magnesium: 27/)).toBeInTheDocument());
    expect(screen.getByText(/Good to give again when the mood is Sad/)).toBeInTheDocument();
    expect(screen.getByText(/space repeats out over a few days/)).toBeInTheDocument();
  });

  it("shows a message when there's no check-in history yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        if (url.includes("/nutrition-history")) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ rules: {}, medians: {} }) });
      })
    );
    render(<MoodHistoryCard hidden={false} studentId={6} />);
    expect(await screen.findByText("No check-ins yet.")).toBeInTheDocument();
  });

  it("switches to a different real date and shows that day's real check-ins", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const otherDayRow = {
      mood_id: 2,
      mood: "happy",
      detected_at: yesterday.toISOString(),
      subject: "Science",
      foods: ["Apple"],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        if (url.includes("/nutrition-history")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([historyRow, otherDayRow]) });
        }
        return mockFetchImpl(url);
      })
    );
    render(<MoodHistoryCard hidden={false} studentId={6} />);
    await screen.findByText(/Sad — Mathematics/);
    expect(screen.queryByText(/Happy — Science/)).not.toBeInTheDocument();

    const dateInput = screen.getByLabelText("Date");
    fireEvent.change(dateInput, { target: { value: yesterdayStr } });

    expect(await screen.findByText(/Happy — Science/)).toBeInTheDocument();
    expect(screen.queryByText(/Sad — Mathematics/)).not.toBeInTheDocument();
  });
});
