import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NutritionCard from "./NutritionCard";

describe("NutritionCard", () => {
  it("renders every snack passed in", () => {
    render(<NutritionCard hidden={false} snacks={["Apple slices", "Plain yogurt", "Carrot sticks"]} />);
    expect(screen.getByText("Apple slices")).toBeInTheDocument();
    expect(screen.getByText("Plain yogurt")).toBeInTheDocument();
    expect(screen.getByText("Carrot sticks")).toBeInTheDocument();
  });

  it("shows the hydration reminder", () => {
    render(<NutritionCard hidden={false} snacks={[]} />);
    expect(screen.getByText(/water reminder/i)).toBeInTheDocument();
  });
});
