// Pure math, deliberately separated from the Stripe API calls in stripe.ts
// and actions.ts so the fee/payout arithmetic can be unit tested without a
// live Stripe key or a database.

export function dollarsToCents(amount: string | number): number {
  return Math.round(Number(amount) * 100);
}

export function centsToDollarString(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Platform fee taken on milestone funding and hourly invoices, in basis
// points (1000 = 10%).
export function calculateFeeCents(amount: string | number, feeBps: number): number {
  return Math.round((dollarsToCents(amount) * feeBps) / 10000);
}

// The escrow model (see modules/payments/actions.ts): funding collects the
// full amount, and payout is the funded amount minus the platform fee
// already recorded at funding time.
export function calculatePayoutCents(amount: string | number, platformFeeCents: number): number {
  return dollarsToCents(amount) - platformFeeCents;
}
