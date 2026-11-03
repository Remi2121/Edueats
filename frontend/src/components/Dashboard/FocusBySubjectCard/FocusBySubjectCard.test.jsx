import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FocusBySubjectCard from "./FocusBySubjectCard";

describe("FocusBySubjectCard", () => {
  it("sorts subjects highest score first", () => {
    const subjects = [
      { name: "Mathematics", score: 58 },
      { name: "Science", score: 68 },
      { name: "English", score: 74 },
    ];
    render(<FocusBySubjectCard hidden={false} subjects={subjects} />);

    const labels = screen.getAllByText(/Mathematics|Science|English/).map((el) => el.textContent);
    expect(labels).toEqual(["English", "Science", "Mathematics"]);
  });

  it("marks the top subject's row with the 'top' class", () => {
    const subjects = [
      { name: "Mathematics", score: 58 },
      { name: "English", score: 74 },
    ];
    const { container } = render(<FocusBySubjectCard hidden={false} subjects={subjects} />);
    const topRow = container.querySelector(".subject-bar-row.top");
    expect(topRow).toHaveTextContent("English");
  });
});
