import { describe, it, expect } from "vitest";
import { classify } from "./statusClassify";

describe("classify", () => {
  it("maps positive-outcome statuses to success, regardless of which module they came from", () => {
    // project, agreement, milestone, payment, dispute, report statuses all
    // share this classifier — the whole point is that "active"/"completed"
    // etc. read the same color everywhere.
    for (const status of ["published", "active", "completed", "funded", "paid", "succeeded", "resolved"]) {
      expect(classify(status)).toBe("success");
    }
  });

  it("maps negative-outcome statuses to danger", () => {
    for (const status of ["cancelled", "disputed", "declined", "failed", "expired"]) {
      expect(classify(status)).toBe("danger");
    }
  });

  it("maps not-yet-resolved statuses to warning", () => {
    for (const status of ["draft", "pending", "pending_acceptance", "submitted", "open"]) {
      expect(classify(status)).toBe("warning");
    }
  });

  it("maps in-progress/informational statuses to info", () => {
    for (const status of ["shortlisted", "under_review", "in_progress", "viewed"]) {
      expect(classify(status)).toBe("info");
    }
  });

  it("falls back to neutral for any status not in the known lists", () => {
    expect(classify("some_future_status_nobody_added_yet")).toBe("neutral");
  });
});
