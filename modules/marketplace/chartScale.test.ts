import { describe, it, expect } from "vitest";
import { buildXScale, buildYScale, niceStep, buildYTicks, buildLinePath } from "./chartScale";

describe("buildYScale", () => {
  it("maps 0 to the bottom of the inner area and max to the top", () => {
    const scale = buildYScale(100, 220, { top: 20, bottom: 20 });
    expect(scale(0)).toBe(200); // padding.top + innerHeight
    expect(scale(100)).toBe(20); // padding.top
  });

  it("never divides by zero when every value is 0", () => {
    const scale = buildYScale(0, 220, { top: 20, bottom: 20 });
    expect(Number.isFinite(scale(0))).toBe(true);
  });
});

describe("buildXScale", () => {
  it("spreads points evenly across the inner width", () => {
    const scale = buildXScale(3, 320, { left: 40, right: 20 });
    expect(scale(0)).toBe(40);
    expect(scale(2)).toBe(300); // left + innerWidth
    expect(scale(1)).toBeCloseTo(170, 5);
  });

  it("centers a single point instead of dividing by zero", () => {
    const scale = buildXScale(1, 320, { left: 40, right: 20 });
    expect(scale(0)).toBe(170);
  });
});

describe("niceStep / buildYTicks", () => {
  it("rounds to a clean step rather than the raw max", () => {
    expect(niceStep(97, 4)).toBe(50);
    expect(buildYTicks(97, 4)).toEqual([0, 50, 100]);
  });

  it("returns a single 0 tick rather than a fabricated step when there's no positive data", () => {
    expect(buildYTicks(0, 4)).toEqual([0]);
  });
});

describe("buildLinePath", () => {
  const xScale = buildXScale(4, 300, { left: 0, right: 0 });
  const yScale = buildYScale(10, 100, { top: 0, bottom: 0 });

  it("draws a single continuous path when there are no gaps", () => {
    const path = buildLinePath([0, 5, 10, 5], xScale, yScale);
    expect(path.match(/M/g)).toHaveLength(1);
    expect(path.match(/L/g)).toHaveLength(3);
  });

  it("starts a new segment after a null gap instead of connecting across it", () => {
    const path = buildLinePath([0, null, 10, 5], xScale, yScale);
    expect(path.match(/M/g)).toHaveLength(2);
    expect(path.match(/L/g)).toHaveLength(1);
  });

  it("returns an empty string when every value is null", () => {
    expect(buildLinePath([null, null], xScale, yScale)).toBe("");
  });
});
