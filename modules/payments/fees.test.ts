import { describe, it, expect } from "vitest";
import { dollarsToCents, centsToDollarString, calculateFeeCents, calculatePayoutCents } from "./fees";

describe("dollarsToCents", () => {
  it("converts a dollar string to cents", () => {
    expect(dollarsToCents("500")).toBe(50000);
    expect(dollarsToCents("19.99")).toBe(1999);
  });

  it("rounds to the nearest cent to avoid floating-point drift", () => {
    expect(dollarsToCents("10.005")).toBe(1001); // rounds, doesn't truncate to 1000
  });

  it("treats an empty/undefined amount as zero", () => {
    expect(dollarsToCents(0)).toBe(0);
  });
});

describe("centsToDollarString", () => {
  it("formats cents back to a 2-decimal dollar string", () => {
    expect(centsToDollarString(50000)).toBe("500.00");
    expect(centsToDollarString(1999)).toBe("19.99");
  });
});

describe("calculateFeeCents", () => {
  it("computes a 10% platform fee (1000 bps)", () => {
    // The real-world case this session's manual verification caught:
    // a $500 milestone at the app's actual 10% rate.
    expect(calculateFeeCents("500", 1000)).toBe(5000); // $50.00
  });

  it("computes other basis-point rates correctly", () => {
    expect(calculateFeeCents("100", 250)).toBe(250); // 2.5% of $100 = $2.50
  });

  it("returns zero fee at 0 bps", () => {
    expect(calculateFeeCents("500", 0)).toBe(0);
  });
});

describe("calculatePayoutCents", () => {
  it("subtracts the already-recorded platform fee from the funded amount", () => {
    // $500 funded, $50 fee already taken at funding time -> $450 payout,
    // matching modules/payments/actions.ts's escrow model (fund now,
    // payout minus fee later — see approveMilestone).
    const feeCents = calculateFeeCents("500", 1000);
    expect(calculatePayoutCents("500", feeCents)).toBe(45000); // $450.00
  });

  it("never produces a payout larger than the funded amount", () => {
    const feeCents = calculateFeeCents("200", 1000);
    const payoutCents = calculatePayoutCents("200", feeCents);
    expect(payoutCents).toBeLessThan(dollarsToCents("200"));
  });
});
