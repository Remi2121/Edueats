import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AlertsCard from "./AlertsCard";

const sad = { name: "Sad", bg: "var(--mood-sad-bg)" };

function daysAgoIso(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe("AlertsCard", () => {
  it("shows the empty message when there are no alerts", () => {
    render(<AlertsCard hidden={false} alerts={[]} />);
    expect(screen.getByText("No alerts sent in this period.")).toBeInTheDocument();
  });

  it("lists an alert with mood, subject and time", () => {
    render(<AlertsCard hidden={false} alerts={[{ mood: sad, subject: "Mathematics", time: "9:05 AM" }]} />);
    expect(screen.getByText(/Sad detected during Mathematics/)).toBeInTheDocument();
    expect(screen.getByText("9:05 AM")).toBeInTheDocument();
    expect(screen.queryByText("No alerts sent in this period.")).not.toBeInTheDocument();
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

  it("only shows the last 5 days at first, and expands 5 days at a time up to 15", () => {
    const alerts = [
      { mood: sad, subject: "Recent", time: "today", sentAt: daysAgoIso(2) },
      { mood: sad, subject: "MidRange", time: "6 days ago", sentAt: daysAgoIso(7) },
      { mood: sad, subject: "Oldest", time: "14 days ago", sentAt: daysAgoIso(14) },
    ];
    render(<AlertsCard hidden={false} alerts={alerts} />);

    expect(screen.getByText(/Sad detected during Recent/)).toBeInTheDocument();
    expect(screen.queryByText(/Sad detected during MidRange/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sad detected during Oldest/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Show 10 days/ }));
    expect(screen.getByText(/Sad detected during MidRange/)).toBeInTheDocument();
    expect(screen.queryByText(/Sad detected during Oldest/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Show 15 days/ }));
    expect(screen.getByText(/Sad detected during Oldest/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show \d+ days/ })).not.toBeInTheDocument();
  });
});
