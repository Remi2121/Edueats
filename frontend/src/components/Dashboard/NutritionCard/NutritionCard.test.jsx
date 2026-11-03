import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NutritionCard from "./NutritionCard";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ food_name: "Apple slices", calories: 48, fat_g: 0.13, sugar_g: 10.1, water_ml: 86.67, magnesium_mg: 4, vitamin_b_mg: 0.04 }),
    })
  );
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

  it("switches to the My Food Log placeholder tab", async () => {
    render(<NutritionCard hidden={false} snacks={["Apple slices"]} />);
    await userEvent.click(screen.getByText("My Food Log"));
    expect(screen.getByText(/food logging isn't built yet/i)).toBeInTheDocument();
  });

  it("shows real nutrient details when a food card is clicked", async () => {
    render(<NutritionCard hidden={false} snacks={["Apple slices"]} />);
    await userEvent.click(screen.getByText("Apple slices"));

    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/foods/Apple%20slices");
    expect(await screen.findByText("48 kcal")).toBeInTheDocument();
    expect(screen.getByText("4 mg")).toBeInTheDocument();
  });
});
