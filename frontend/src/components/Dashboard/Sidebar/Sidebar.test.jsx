import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar";

const student = { name: "Luke Remingan", classLine: "Grade 8 · Rm 214", photoDataUrl: null };

describe("Sidebar", () => {
  it("shows the student's name, class and initials", () => {
    render(<Sidebar student={student} activeView="overview" onNavigate={() => {}} onLogout={() => {}} />);
    expect(screen.getByText("Luke Remingan")).toBeInTheDocument();
    expect(screen.getByText("Grade 8 · Rm 214")).toBeInTheDocument();
    expect(screen.getByText("LR")).toBeInTheDocument();
  });

  it("marks the active view's nav link", () => {
    render(<Sidebar student={student} activeView="nutrition" onNavigate={() => {}} onLogout={() => {}} />);
    expect(screen.getByText("Nutrition")).toHaveClass("active");
    expect(screen.getByText("Dashboard")).not.toHaveClass("active");
  });

  it("calls onNavigate with the clicked view", async () => {
    const onNavigate = vi.fn();
    render(<Sidebar student={student} activeView="overview" onNavigate={onNavigate} onLogout={() => {}} />);
    await userEvent.click(screen.getByText("Alerts"));
    expect(onNavigate).toHaveBeenCalledWith("alerts");
  });

  it("calls onLogout when Log out is clicked", async () => {
    const onLogout = vi.fn();
    render(<Sidebar student={student} activeView="overview" onNavigate={() => {}} onLogout={onLogout} />);
    await userEvent.click(screen.getByText("Log out"));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
