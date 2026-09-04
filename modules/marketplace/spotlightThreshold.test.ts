import { describe, it, expect } from "vitest";
import { meetsFeaturedThreshold } from "./spotlightThreshold";

describe("meetsFeaturedThreshold", () => {
  it("fails below the floor", () => {
    expect(meetsFeaturedThreshold(0, 2)).toBe(false);
    expect(meetsFeaturedThreshold(1, 2)).toBe(false);
  });

  it("passes at or above the floor", () => {
    expect(meetsFeaturedThreshold(2, 2)).toBe(true);
    expect(meetsFeaturedThreshold(10, 2)).toBe(true);
  });
});
