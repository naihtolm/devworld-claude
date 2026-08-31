# payments

Owns: Stripe Connect integration, funding, payouts, the payment ledger.

Table: `payments` (append-only — never update a row's meaning, insert a new
one; e.g. a refund is a new row of type `refund` referencing the same
milestone).

Build order:
1. Onboard developers as Stripe Connect accounts (Express) during profile
   setup or before their first accepted agreement — this is where identity
   verification/KYC happens, Stripe handles it entirely
2. On milestone funding: create a PaymentIntent, store its ID on
   `milestones.stripePaymentIntentId`, insert a `payments` row
   (`type: milestone_funding`, `status: pending` → updated by webhook)
3. On milestone approval: create a Transfer to the developer's connected
   account, store on `milestones.stripeTransferId`, insert a `payments` row
   (`type: milestone_payout`)
4. Stripe webhook handler (`/api/webhooks/stripe`) is the source of truth for
   `payments.status` — never mark a payment succeeded from the client

Platform fee: capture via `application_fee_amount` on the PaymentIntent/
Transfer rather than a separate charge — simpler reconciliation.
