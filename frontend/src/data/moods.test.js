import { describe, expect, it } from "vitest";
import { MOODS, initials, timeNow } from "./moods";

describe("moods data", () => {
  it("has all 7 FER-2013 mood categories", () => {
    const names = MOODS.map((m) => m.name);
    expect(names).toEqual(["Happy", "Sad", "Angry", "Fear", "Disgust", "Neutral", "Surprise"]);
  });

  it("marks only the negative moods as concerning", () => {
    const concerning = MOODS.filter((m) => m.concerning).map((m) => m.name);
    expect(concerning).toEqual(["Sad", "Angry", "Fear", "Disgust"]);
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Aanya Ravindran")).toBe("AR");
  });

  it("uppercases a single name", () => {
    expect(initials("aanya")).toBe("A");
  });

  it("ignores extra middle names beyond two", () => {
    expect(initials("Aanya Kumari Ravindran")).toBe("AK");
  });
});

describe("timeNow", () => {
  it("returns a time string in H:MM AM/PM format", () => {
    expect(timeNow()).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });
});
