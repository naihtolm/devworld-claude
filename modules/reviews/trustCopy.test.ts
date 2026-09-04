import { describe, it, expect } from "vitest";
import { shouldShowTrustSection, trustSectionSubcopy } from "./trustCopy";

describe("shouldShowTrustSection", () => {
  it("hides the section when there are no reviews yet", () => {
    expect(shouldShowTrustSection(0)).toBe(false);
  });

  it("shows the section once at least one real review exists", () => {
    expect(shouldShowTrustSection(1)).toBe(true);
    expect(shouldShowTrustSection(50)).toBe(true);
  });
});

describe("trustSectionSubcopy", () => {
  it("bakes the real count into honest, volume-agnostic copy", () => {
    expect(trustSectionSubcopy(1)).toBe(
      "Every review on Devworld comes from a real completed project — 1 so far."
    );
    expect(trustSectionSubcopy(42)).toBe(
      "Every review on Devworld comes from a real completed project — 42 so far."
    );
  });
});
