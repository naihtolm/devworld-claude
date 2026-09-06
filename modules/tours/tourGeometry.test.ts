import { describe, it, expect } from "vitest";
import { computeTooltipPosition, computeSpotlightRect, computeBackdropPanels } from "./tourGeometry";

const viewport = { width: 1000, height: 800 };
const tooltip = { width: 320, height: 160 };

describe("computeTooltipPosition", () => {
  it("places the tooltip below the target when there's room", () => {
    const target = { top: 100, left: 400, width: 200, height: 40 };
    const result = computeTooltipPosition(target, viewport, tooltip, "bottom");
    expect(result.placement).toBe("bottom");
    expect(result.top).toBe(100 + 40 + 12);
  });

  it("flips above the target when there's no room below", () => {
    const target = { top: 700, left: 400, width: 200, height: 40 };
    const result = computeTooltipPosition(target, viewport, tooltip, "bottom");
    expect(result.placement).toBe("top");
    expect(result.top).toBe(700 - 160 - 12);
  });

  it("respects an explicit top preference when there's room above", () => {
    const target = { top: 400, left: 400, width: 200, height: 40 };
    const result = computeTooltipPosition(target, viewport, tooltip, "top");
    expect(result.placement).toBe("top");
  });

  it("centers horizontally on the target", () => {
    const target = { top: 100, left: 400, width: 200, height: 40 };
    const result = computeTooltipPosition(target, viewport, tooltip, "bottom");
    // target center = 500, tooltip half-width = 160 -> left = 340
    expect(result.left).toBe(340);
  });

  it("clamps left so the tooltip never overflows the viewport", () => {
    const target = { top: 100, left: 0, width: 20, height: 40 };
    const result = computeTooltipPosition(target, viewport, tooltip, "bottom");
    expect(result.left).toBeGreaterThanOrEqual(12);
  });

  it("clamps right so the tooltip never overflows the viewport", () => {
    const target = { top: 100, left: 990, width: 10, height: 40 };
    const result = computeTooltipPosition(target, viewport, tooltip, "bottom");
    expect(result.left + tooltip.width).toBeLessThanOrEqual(viewport.width - 12 + 1);
  });

  it("never throws when the tooltip is larger than the viewport", () => {
    const target = { top: 100, left: 100, width: 20, height: 20 };
    const huge = { width: 2000, height: 2000 };
    expect(() => computeTooltipPosition(target, viewport, huge, "bottom")).not.toThrow();
  });
});

describe("computeSpotlightRect", () => {
  it("pads the target rect evenly on all sides", () => {
    const target = { top: 100, left: 200, width: 300, height: 40 };
    expect(computeSpotlightRect(target, 6)).toEqual({ top: 94, left: 194, width: 312, height: 52 });
  });

  it("defaults to a 6px pad", () => {
    const target = { top: 0, left: 0, width: 10, height: 10 };
    expect(computeSpotlightRect(target)).toEqual({ top: -6, left: -6, width: 22, height: 22 });
  });
});

describe("computeBackdropPanels", () => {
  it("produces four panels that exactly tile the viewport around a centered hole", () => {
    const spotlight = { top: 100, left: 100, width: 200, height: 50 };
    const [above, below, left, right] = computeBackdropPanels(spotlight, viewport);

    expect(above).toEqual({ top: 0, left: 0, width: 1000, height: 100 });
    expect(below).toEqual({ top: 150, left: 0, width: 1000, height: 650 });
    expect(left).toEqual({ top: 100, left: 0, width: 100, height: 50 });
    expect(right).toEqual({ top: 100, left: 300, width: 700, height: 50 });
  });

  it("never produces a negative-size panel when the hole is above the viewport", () => {
    const spotlight = { top: -50, left: 100, width: 200, height: 30 }; // bottom at -20, fully off-screen above
    const panels = computeBackdropPanels(spotlight, viewport);
    for (const p of panels) {
      expect(p.width).toBeGreaterThanOrEqual(0);
      expect(p.height).toBeGreaterThanOrEqual(0);
    }
  });

  it("never produces a negative-size panel when the hole is below the viewport", () => {
    const spotlight = { top: 900, left: 100, width: 200, height: 30 };
    const panels = computeBackdropPanels(spotlight, viewport);
    for (const p of panels) {
      expect(p.width).toBeGreaterThanOrEqual(0);
      expect(p.height).toBeGreaterThanOrEqual(0);
    }
  });

  it("never produces a negative-size panel when the hole spans past the right edge", () => {
    const spotlight = { top: 100, left: 900, width: 300, height: 30 };
    const panels = computeBackdropPanels(spotlight, viewport);
    for (const p of panels) {
      expect(p.width).toBeGreaterThanOrEqual(0);
      expect(p.height).toBeGreaterThanOrEqual(0);
    }
  });
});
