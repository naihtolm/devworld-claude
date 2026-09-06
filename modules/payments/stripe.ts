import Stripe from "stripe";
import { calculatePayoutCents, centsToDollarString } from "@/modules/payments/fees";

let stripe: Stripe | null = null;

// Lazy singleton so a missing key only breaks the payment paths that need
// it, not every page load (same reasoning as db/index.ts's DATABASE_URL
// check, but deferred since most of the app doesn't touch Stripe).
export function getStripe() {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith("sk_test_...")) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — see .env.example and the README's Stripe setup step."
    );
  }
  stripe = new Stripe(key);
  return stripe;
}

// Two separate fees (both 2.75%), replacing the old single 10%
// developer-side-only fee — combined platform take is 5.5% per
// transaction. CLIENT_FEE_BPS is charged on top at checkout (a second,
// clearly labeled line item — see createFundingCheckout in
// modules/payments/actions.ts); DEVELOPER_FEE_BPS is deducted from the
// payout at approval/invoice-payment time, same mechanism as before.
export const CLIENT_FEE_BPS = 275;
export const DEVELOPER_FEE_BPS = 275;

// Escrow model: funding moves money to the platform's own Stripe balance
// (see modules/payments/actions.ts's createFundingCheckout), and this is
// the actual payout leg — an explicit Transfer for the escrowed amount
// minus the platform fee. Shared by milestone approval (a server action)
// and the webhook's immediate hourly-invoice payout, so it lives here
// rather than in the "use server" actions file.
export async function payoutToDeveloper({
  developerStripeAccountId,
  amount,
  developerFeeCents,
  transferGroup,
}: {
  developerStripeAccountId: string;
  amount: string;
  developerFeeCents: number;
  transferGroup: string;
}) {
  const stripe = getStripe();
  const payoutCents = calculatePayoutCents(amount, developerFeeCents);

  const transfer = await stripe.transfers.create({
    amount: payoutCents,
    currency: "usd",
    destination: developerStripeAccountId,
    transfer_group: transferGroup,
  });

  return { transfer, payoutAmount: centsToDollarString(payoutCents) };
}
