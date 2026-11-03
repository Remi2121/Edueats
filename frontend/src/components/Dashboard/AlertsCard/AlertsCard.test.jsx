import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AlertsCard from "./AlertsCard";

const sad = { name: "Sad", bg: "var(--mood-sad-bg)" };

describe("AlertsCard", () => {
  it("shows the empty message when there are no alerts", () => {
    render(<AlertsCard hidden={false} alerts={[]} />);
    expect(screen.getByText("No alerts sent yet today.")).toBeInTheDocument();
  });

  it("lists an alert with mood, subject and time", () => {
    render(<AlertsCard hidden={false} alerts={[{ mood: sad, subject: "Mathematics", time: "9:05 AM" }]} />);
    expect(screen.getByText(/Sad detected during Mathematics/)).toBeInTheDocument();
    expect(screen.getByText("9:05 AM")).toBeInTheDocument();
    expect(screen.queryByText("No alerts sent yet today.")).not.toBeInTheDocument();
  });

  it("omits the subject clause when no session was running", () => {
    render(<AlertsCard hidden={false} alerts={[{ mood: sad, subject: null, time: "9:05 AM" }]} />);
    expect(screen.getByText("Sad detected — parent notified")).toBeInTheDocument();
  });

  it("includes the real suggested foods when the alert has them", () => {
    render(
      <AlertsCard
        hidden={false}
        alerts={[{ mood: sad, subject: "Mathematics", time: "9:05 AM", foods: ["Banana", "Oats"] }]}
      />
    );
    expect(screen.getByText(/\(suggested: Banana, Oats\)/)).toBeInTheDocument();
  });
});
