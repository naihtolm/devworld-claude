import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { payments, milestones, developerProfiles, agreements } from "@/db/schema";
import { getStripe, payoutToDeveloper } from "@/modules/payments/stripe";
import type Stripe from "stripe";

// Stripe (not the client) is the source of truth for payment status — see
// modules/payments/README.md build order item 4.
export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const milestoneId = session.metadata?.milestoneId;
      const paymentId = session.metadata?.paymentId;
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

      if (milestoneId) {
        await db
          .update(payments)
          .set({ status: "succeeded", stripePaymentIntentId: paymentIntentId, updatedAt: new Date() })
          .where(and(eq(payments.milestoneId, milestoneId), eq(payments.type, "milestone_funding")));

        await db
          .update(milestones)
          .set({ status: "funded", updatedAt: new Date() })
          .where(eq(milestones.id, milestoneId));
      } else if (paymentId) {
        // Hourly invoice: no separate approval step (it's for work already
        // done — see modules/payments/actions.ts's payHourlyInvoice), so
        // payment succeeding is itself what triggers the payout.
        const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
        if (payment && payment.status === "pending" && payment.agreementId) {
          await db
            .update(payments)
            .set({ status: "succeeded", stripePaymentIntentId: paymentIntentId, updatedAt: new Date() })
            .where(eq(payments.id, paymentId));

          const [agreement] = await db.select().from(agreements).where(eq(agreements.id, payment.agreementId));
          const [developerProfile] = agreement
            ? await db
                .select()
                .from(developerProfiles)
                .where(eq(developerProfiles.id, agreement.developerProfileId))
            : [];

          if (developerProfile?.stripeAccountId) {
            const platformFeeCents = Math.round(Number(payment.platformFeeAmount ?? 0) * 100);
            const { transfer, payoutAmount } = await payoutToDeveloper({
              developerStripeAccountId: developerProfile.stripeAccountId,
              amount: payment.amount,
              platformFeeCents,
              transferGroup: `hourly_invoice_${paymentId}`,
            });

            await db.insert(payments).values({
              agreementId: payment.agreementId,
              type: "milestone_payout",
              amount: payoutAmount,
              stripeTransferId: transfer.id,
              status: "succeeded",
            });
          }
        }
      }
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      if (account.details_submitted && account.charges_enabled) {
        await db
          .update(developerProfiles)
          .set({ stripeOnboardingComplete: true, updatedAt: new Date() })
          .where(eq(developerProfiles.stripeAccountId, account.id));
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
