import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MoodHistoryCard from "./MoodHistoryCard";

const happy = { name: "Happy", emoji: "🙂", bg: "var(--mood-happy-bg)", ink: "var(--mood-happy-ink)" };
const sad = { name: "Sad", emoji: "😔", bg: "var(--mood-sad-bg)", ink: "var(--mood-sad-ink)" };

describe("MoodHistoryCard", () => {
  it("shows the latest mood and the update label", () => {
    render(
      <MoodHistoryCard
        hidden={false}
        latestMood={happy}
        moodUpdatedLabel="Last updated today 9:00 AM"
        timeline={[]}
      />
    );
    expect(screen.getByText("🙂 Happy")).toBeInTheDocument();
    expect(screen.getByText("Last updated today 9:00 AM")).toBeInTheDocument();
  });

  it("renders one dot per timeline entry", () => {
    const timeline = [
      { mood: happy, when: "Mon 9:05 AM" },
      { mood: sad, when: "Tue 8:55 AM" },
    ];
    const { container } = render(
      <MoodHistoryCard hidden={false} latestMood={happy} moodUpdatedLabel="" timeline={timeline} />
    );
    expect(container.querySelectorAll(".mood-dot")).toHaveLength(2);
  });
});
