import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar";

describe("Sidebar", () => {
  it("shows every real nav item", () => {
    render(<Sidebar activeView="overview" onNavigate={() => {}} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Study Session")).toBeInTheDocument();
    expect(screen.getByText("My Nutrition")).toBeInTheDocument();
    expect(screen.getByText("Mood & Focus")).toBeInTheDocument();
    expect(screen.getByText("My Progress")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("marks the active view's nav link", () => {
    render(<Sidebar activeView="nutrition" onNavigate={() => {}} />);
    expect(screen.getByText("My Nutrition")).toHaveClass("active");
    expect(screen.getByText("Dashboard")).not.toHaveClass("active");
  });

  it("calls onNavigate with the clicked view", async () => {
    const onNavigate = vi.fn();
    render(<Sidebar activeView="overview" onNavigate={onNavigate} />);
    await userEvent.click(screen.getByText("Settings"));
    expect(onNavigate).toHaveBeenCalledWith("settings");
  });
});
