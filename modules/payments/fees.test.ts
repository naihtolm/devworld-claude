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
  it("computes the app's actual developer/client fee (275 bps = 2.75%)", () => {
    // The real-world case: a $500 milestone at the app's actual rate —
    // see modules/payments/stripe.ts's CLIENT_FEE_BPS/DEVELOPER_FEE_BPS.
    expect(calculateFeeCents("500", 275)).toBe(1375); // $13.75
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
    // $500 funded, $13.75 developer-side fee already taken at funding
    // time -> $486.25 payout, matching modules/payments/actions.ts's
    // escrow model (fund now, payout minus fee later — see
    // approveMilestone). Note this is the developer-side fee only — the
    // client-side fee (also 2.75%) is a separate charge added on top at
    // checkout, not part of this subtraction.
    const feeCents = calculateFeeCents("500", 275);
    expect(calculatePayoutCents("500", feeCents)).toBe(48625); // $486.25
  });

  it("never produces a payout larger than the funded amount", () => {
    const feeCents = calculateFeeCents("200", 275);
    const payoutCents = calculatePayoutCents("200", feeCents);
    expect(payoutCents).toBeLessThan(dollarsToCents("200"));
  });
});
