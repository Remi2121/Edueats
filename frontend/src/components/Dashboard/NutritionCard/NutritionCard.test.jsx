import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NutritionCard from "./NutritionCard";

const CATALOG = [
  { food_name: "Apple", calories: 52, fat_g: 0.2, sugar_g: 10.4, water_ml: 86, magnesium_mg: 5, vitamin_b_mg: 0.04, tamil_name: "ஆப்பிள்", sinhala_name: "ඇපල්", price_lkr: 150, category: "Fruit" },
  { food_name: "Spinach", calories: 23, fat_g: 0.4, sugar_g: 0.4, water_ml: 91, magnesium_mg: 79, vitamin_b_mg: 0.2, tamil_name: "பசலைக்கீரை", sinhala_name: "නිවිති", price_lkr: 60, category: "Vegetable" },
  { food_name: "Almonds", calories: 579, fat_g: 49.9, sugar_g: 4.4, water_ml: 4, magnesium_mg: 270, vitamin_b_mg: 0.14, tamil_name: "பாதாம்", sinhala_name: "ආමන්ඩ්", price_lkr: 220, category: "Nuts" },
];

const HISTORY = [
  { mood_id: 1, mood: "sad", detected_at: "2026-11-24T09:05:00.000Z", subject: "Mathematics", foods: ["Apple", "Almonds"] },
];

function mockFetchImpl(url) {
  if (url.endsWith("/api/foods/full")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(CATALOG) });
  }
  if (url.includes("/nutrition-history")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(HISTORY) });
  }
  if (url.includes("/restrictions")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  }
  if (url.includes("/api/foods/")) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          food_name: "Apple", calories: 52, fat_g: 0.2, sugar_g: 10.4, water_ml: 86, magnesium_mg: 5, vitamin_b_mg: 0.04,
        }),
    });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(mockFetchImpl));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NutritionCard", () => {
  it("loads the real food catalog and shows each food as a card with real nutrient stats", async () => {
    render(<NutritionCard hidden={false} snacks={["Apple"]} />);
    expect(await screen.findByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Spinach")).toBeInTheDocument();
    expect(screen.getByText("Almonds")).toBeInTheDocument();
    expect(screen.getByText("52")).toBeInTheDocument(); // Apple's calories
    expect(screen.getByText("Rs. 150")).toBeInTheDocument();
  });

  it("marks foods that match the current mood's recommendation as Recommended", async () => {
    render(<NutritionCard hidden={false} snacks={["Apple"]} />);
    await screen.findByText("Apple");
    expect(screen.getByText(/Recommended/)).toBeInTheDocument();
    expect(screen.getAllByText(/Available/).length).toBe(2); // Spinach + Almonds
  });

  it("filters the catalog by category", async () => {
    render(<NutritionCard hidden={false} snacks={[]} />);
    await screen.findByText("Apple");
    await userEvent.click(screen.getByRole("button", { name: "Nuts" }));
    expect(screen.getByText("Almonds")).toBeInTheDocument();
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.queryByText("Spinach")).not.toBeInTheDocument();
  });

  it("filters the catalog by search text, matching Tamil/Sinhala names too", async () => {
    render(<NutritionCard hidden={false} snacks={[]} />);
    await screen.findByText("Apple");
    await userEvent.type(screen.getByPlaceholderText(/search in english/i), "නිවිති");
    expect(screen.getByText("Spinach")).toBeInTheDocument();
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
  });

  it("hides foods the parent has restricted for this student", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        if (url.includes("/restrictions")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(["Almonds"]) });
        }
        return mockFetchImpl(url);
      })
    );
    render(<NutritionCard hidden={false} snacks={[]} studentId={6} />);
    await screen.findByRole("heading", { level: 3, name: "Apple" });
    expect(screen.queryByRole("heading", { level: 3, name: "Almonds" })).not.toBeInTheDocument();
  });

  it("shows this student's real check-in history with the foods matched each time", async () => {
    render(<NutritionCard hidden={false} snacks={[]} studentId={6} />);
    expect(await screen.findByText(/Sad — Mathematics/)).toBeInTheDocument();
    expect(screen.getByText("Your food history")).toBeInTheDocument();
    expect(screen.getByText(/Most suggested:/)).toBeInTheDocument();
  });

  it("only shows the selected calendar month's check-ins, navigated like a calendar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        if (url.includes("/nutrition-history")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                ...HISTORY,
                { mood_id: 2, mood: "happy", detected_at: "2026-10-15T09:05:00.000Z", subject: "Science", foods: ["Spinach"] },
              ]),
          });
        }
        return mockFetchImpl(url);
      })
    );
    render(<NutritionCard hidden={false} snacks={[]} studentId={6} />);
    await screen.findByText(/Sad — Mathematics/);
    expect(screen.queryByText(/Happy — Science/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /previous month/i }));

    expect(await screen.findByText(/Happy — Science/)).toBeInTheDocument();
    expect(screen.queryByText(/Sad — Mathematics/)).not.toBeInTheDocument();
  });

  it("opens a real nutrient popup when a food chip from the history is clicked", async () => {
    render(<NutritionCard hidden={false} snacks={[]} studentId={6} />);
    await screen.findByText(/Sad — Mathematics/);

    await userEvent.click(screen.getByRole("button", { name: "Apple" }));

    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/foods/Apple");
    await waitFor(() => expect(screen.getByText("52 kcal")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByText("52 kcal")).not.toBeInTheDocument();
  });
});
