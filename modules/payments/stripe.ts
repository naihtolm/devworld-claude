import Stripe from "stripe";

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

// Platform fee taken on milestone funding, in basis points (10% here).
export const PLATFORM_FEE_BPS = 1000;

// Escrow model: funding moves money to the platform's own Stripe balance
// (see modules/payments/actions.ts's createFundingCheckout), and this is
// the actual payout leg — an explicit Transfer for the escrowed amount
// minus the platform fee. Shared by milestone approval (a server action)
// and the webhook's immediate hourly-invoice payout, so it lives here
// rather than in the "use server" actions file.
export async function payoutToDeveloper({
  developerStripeAccountId,
  amount,
  platformFeeCents,
  transferGroup,
}: {
  developerStripeAccountId: string;
  amount: string;
  platformFeeCents: number;
  transferGroup: string;
}) {
  const stripe = getStripe();
  const amountCents = Math.round(Number(amount) * 100);
  const payoutCents = amountCents - platformFeeCents;

  const transfer = await stripe.transfers.create({
    amount: payoutCents,
    currency: "usd",
    destination: developerStripeAccountId,
    transfer_group: transferGroup,
  });

  return { transfer, payoutAmount: (payoutCents / 100).toFixed(2) };
}
