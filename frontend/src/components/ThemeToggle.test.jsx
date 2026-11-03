import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("calls onToggle when clicked", async () => {
    const onToggle = vi.fn();
    render(<ThemeToggle theme="light" onToggle={onToggle} onDashboard={false} />);

    await userEvent.click(screen.getByRole("button", { name: /switch between light and dark mode/i }));

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("adds the on-dashboard class when onDashboard is true", () => {
    render(<ThemeToggle theme="light" onToggle={() => {}} onDashboard={true} />);
    expect(screen.getByRole("button")).toHaveClass("on-dashboard");
  });
});
