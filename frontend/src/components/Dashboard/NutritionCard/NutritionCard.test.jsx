import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NutritionCard from "./NutritionCard";

function mockFetchImpl(url, options) {
  if (url.endsWith("/api/foods")) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(["Apple slices", "Banana"]) });
  }
  if (url.includes("/food-log")) {
    if (options && options.method === "POST") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 2, food_name: "Apple slices" }) });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ id: 1, food_name: "Banana", logged_at: "2026-11-01T09:05:00.000Z" }]),
    });
  }
  return Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        food_name: "Apple slices",
        calories: 48,
        fat_g: 0.13,
        sugar_g: 10.1,
        water_ml: 86.67,
        magnesium_mg: 4,
        vitamin_b_mg: 0.04,
      }),
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(mockFetchImpl));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NutritionCard", () => {
  it("renders every recommended food as a card", () => {
    render(<NutritionCard hidden={false} snacks={["Apple slices", "Plain yogurt", "Carrot sticks"]} />);
    expect(screen.getByText("Apple slices")).toBeInTheDocument();
    expect(screen.getByText("Plain yogurt")).toBeInTheDocument();
    expect(screen.getByText("Carrot sticks")).toBeInTheDocument();
  });

  it("shows real nutrient details when a food card is clicked", async () => {
    render(<NutritionCard hidden={false} snacks={["Apple slices"]} />);
    await userEvent.click(screen.getByText("Apple slices"));

    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/foods/Apple%20slices");
    expect(await screen.findByText("48 kcal")).toBeInTheDocument();
    expect(screen.getByText("4 mg")).toBeInTheDocument();
  });

  it("loads a student's real logged food history on the My Food Log tab", async () => {
    const { container } = render(<NutritionCard hidden={false} snacks={["Apple slices"]} studentId={6} />);
    await userEvent.click(screen.getByText("My Food Log"));

    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/foods");
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/students/6/food-log");
    const loggedNames = () => Array.from(container.querySelectorAll(".food-log-name")).map((el) => el.textContent);
    await waitFor(() => expect(loggedNames()).toEqual(["Banana"]));
  });

  it("logs a new food and adds it to the real history list", async () => {
    const { container } = render(<NutritionCard hidden={false} snacks={["Apple slices"]} studentId={6} />);
    await userEvent.click(screen.getByText("My Food Log"));
    const loggedNames = () => Array.from(container.querySelectorAll(".food-log-name")).map((el) => el.textContent);
    await waitFor(() => expect(loggedNames()).toEqual(["Banana"]));

    await userEvent.selectOptions(screen.getByRole("combobox"), "Apple slices");
    await userEvent.click(screen.getByRole("button", { name: /log it/i }));

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/students/6/food-log",
      expect.objectContaining({ method: "POST" })
    );

    await waitFor(() => expect(loggedNames()).toContain("Apple slices"));
  });
});
