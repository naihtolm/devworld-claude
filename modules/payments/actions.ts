"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agreements, developerProfiles, milestones, payments } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { getStripe, PLATFORM_FEE_BPS, payoutToDeveloper } from "@/modules/payments/stripe";

async function requireCurrentDbUser() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) {
    throw new Error("Could not resolve the signed-in user.");
  }
  return user;
}

// Requests don't carry a fixed port in local dev (see D:\Dev\devworld's
// README migration notes — the dev server's port shifts depending on what
// else is running), so derive the origin from the request itself rather
// than trusting NEXT_PUBLIC_APP_URL.
async function getAppOrigin() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Build order item 1 (modules/payments/README.md): a developer needs a
// Stripe Express account before any milestone on their agreements can be
// funded. Triggered from the agreement page rather than a profile settings
// page, since that doesn't exist yet.
export async function connectStripeAccount() {
  const user = await requireCurrentDbUser();
  const stripe = getStripe();
  const origin = await getAppOrigin();

  const [developerProfile] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.userId, user.id));
  if (!developerProfile) {
    throw new Error("No developer profile found.");
  }

  let accountId = developerProfile.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({ type: "express" });
    accountId = account.id;
    await db
      .update(developerProfiles)
      .set({ stripeAccountId: accountId })
      .where(eq(developerProfiles.id, developerProfile.id));
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/proposals`,
    return_url: `${origin}/proposals`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}

// Escrow, not a destination charge: funding a milestone or paying an hourly
// invoice moves money into the PLATFORM's own Stripe balance, not the
// developer's connected account. The developer only gets paid via an
// explicit Transfer later — on milestone approval (approveMilestone below)
// or immediately on the webhook for hourly invoices, since those represent
// work already completed. This matches the schema's separate
// stripePaymentIntentId/stripeTransferId fields and milestone_funding vs
// milestone_payout payment types (modules/payments/README.md build order
// items 2 and 3) — an earlier version of this function used
// transfer_data.destination, which pays the developer immediately at
// funding time instead of holding the money in escrow; that was wrong for
// a marketplace that's supposed to gate payout on approval.
async function createFundingCheckout({
  agreementId,
  amount,
  description,
  metadata,
  origin,
}: {
  agreementId: string;
  amount: string;
  description: string;
  metadata: Record<string, string>;
  origin: string;
}) {
  const stripe = getStripe();
  const amountCents = Math.round(Number(amount) * 100);
  const platformFeeCents = Math.round((amountCents * PLATFORM_FEE_BPS) / 10000);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: description },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata,
    success_url: `${origin}/agreements/${agreementId}?funded=1`,
    cancel_url: `${origin}/agreements/${agreementId}`,
  });

  return { session, platformFeeCents };
}

export async function fundMilestone(milestoneId: string) {
  const user = await requireCurrentDbUser();
  const origin = await getAppOrigin();

  const [row] = await db
    .select({ milestone: milestones, agreement: agreements })
    .from(milestones)
    .innerJoin(agreements, eq(milestones.agreementId, agreements.id))
    .where(eq(milestones.id, milestoneId));
  if (!row) throw new Error("Not found.");
  const { milestone, agreement } = row;

  if (agreement.clientUserId !== user.id) {
    throw new Error("Only the client can fund a milestone.");
  }
  if (agreement.status !== "active") {
    throw new Error("The agreement isn't active yet.");
  }
  if (milestone.status !== "pending") {
    throw new Error("This milestone has already been funded.");
  }

  const [developerProfile] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.id, agreement.developerProfileId));
  if (!developerProfile?.stripeAccountId || !developerProfile.stripeOnboardingComplete) {
    throw new Error("The developer hasn't finished connecting Stripe yet.");
  }

  const { session, platformFeeCents } = await createFundingCheckout({
    agreementId: agreement.id,
    amount: milestone.amount,
    description: `Milestone: ${milestone.title}`,
    metadata: { milestoneId: milestone.id, agreementId: agreement.id },
    origin,
  });

  await db.insert(payments).values({
    agreementId: agreement.id,
    milestoneId: milestone.id,
    type: "milestone_funding",
    amount: milestone.amount,
    platformFeeAmount: (platformFeeCents / 100).toFixed(2),
    status: "pending",
  });

  redirect(session.url!);
}

// Build order item 3: developer marks funded work as ready for review —
// the client approving it (below) is what triggers the actual payout.
export async function submitMilestoneWork(milestoneId: string) {
  const user = await requireCurrentDbUser();

  const [row] = await db
    .select({ milestone: milestones, agreement: agreements })
    .from(milestones)
    .innerJoin(agreements, eq(milestones.agreementId, agreements.id))
    .where(eq(milestones.id, milestoneId));
  if (!row) throw new Error("Not found.");
  const { milestone, agreement } = row;

  const [developerProfile] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.id, agreement.developerProfileId));
  if (developerProfile?.userId !== user.id) {
    throw new Error("Only the developer can submit this milestone.");
  }
  if (milestone.status !== "funded") {
    throw new Error("This milestone isn't funded yet.");
  }

  await db
    .update(milestones)
    .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(milestones.id, milestoneId));

  revalidatePath(`/agreements/${agreement.id}`);
}

// Build order item 3: approval is what creates the Transfer — never mark a
// milestone paid without an actual Stripe transfer behind it.
export async function approveMilestone(milestoneId: string) {
  const user = await requireCurrentDbUser();

  const [row] = await db
    .select({ milestone: milestones, agreement: agreements })
    .from(milestones)
    .innerJoin(agreements, eq(milestones.agreementId, agreements.id))
    .where(eq(milestones.id, milestoneId));
  if (!row) throw new Error("Not found.");
  const { milestone, agreement } = row;

  if (agreement.clientUserId !== user.id) {
    throw new Error("Only the client can approve a milestone.");
  }
  if (milestone.status !== "submitted") {
    throw new Error("This milestone hasn't been submitted yet.");
  }

  const [developerProfile] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.id, agreement.developerProfileId));
  if (!developerProfile?.stripeAccountId) {
    throw new Error("The developer's Stripe account is missing.");
  }

  const [fundingPayment] = await db
    .select()
    .from(payments)
    .where(eq(payments.milestoneId, milestoneId));
  const platformFeeCents = Math.round(Number(fundingPayment?.platformFeeAmount ?? 0) * 100);

  const { transfer, payoutAmount } = await payoutToDeveloper({
    developerStripeAccountId: developerProfile.stripeAccountId,
    amount: milestone.amount,
    platformFeeCents,
    transferGroup: `milestone_${milestoneId}`,
  });

  await db
    .update(milestones)
    .set({ status: "paid", stripeTransferId: transfer.id, approvedAt: new Date(), paidAt: new Date(), updatedAt: new Date() })
    .where(eq(milestones.id, milestoneId));

  await db.insert(payments).values({
    agreementId: agreement.id,
    milestoneId,
    type: "milestone_payout",
    amount: payoutAmount,
    stripeTransferId: transfer.id,
    status: "succeeded",
  });

  revalidatePath(`/agreements/${agreement.id}`);
}

const hourlyInvoiceSchema = z.object({
  hours: z.coerce.number().positive("Enter the hours worked"),
  description: z.string().trim().max(2000).optional(),
});

// Build order item: hourly agreements don't have milestones, so the
// developer submits an invoice for a period worked instead — amount is
// derived from the agreement's agreed hourlyRate, not typed in freely.
export async function submitHourlyInvoice(formData: FormData) {
  const agreementId = formData.get("agreementId");
  if (typeof agreementId !== "string") throw new Error("Missing agreement.");

  const user = await requireCurrentDbUser();

  const [agreement] = await db.select().from(agreements).where(eq(agreements.id, agreementId));
  if (!agreement) throw new Error("Not found.");

  const [developerProfile] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.id, agreement.developerProfileId));
  if (developerProfile?.userId !== user.id) {
    throw new Error("Only the developer on this agreement can submit an invoice.");
  }
  if (agreement.status !== "active") throw new Error("The agreement isn't active.");
  if (agreement.budgetType !== "hourly") throw new Error("This agreement isn't hourly.");
  if (!agreement.hourlyRate) throw new Error("No hourly rate set on this agreement.");

  const parsed = hourlyInvoiceSchema.safeParse({
    hours: formData.get("hours"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const amount = (parsed.data.hours * Number(agreement.hourlyRate)).toFixed(2);

  await db.insert(payments).values({
    agreementId,
    type: "hourly_invoice",
    amount,
    status: "pending",
  });

  revalidatePath(`/agreements/${agreementId}`);
}

// Unlike milestones, hourly invoices are for work already completed — there's
// no separate "approve" gate. Payment succeeding (the webhook) is itself
// what triggers the payout, immediately.
export async function payHourlyInvoice(paymentId: string) {
  const user = await requireCurrentDbUser();
  const origin = await getAppOrigin();

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!payment || payment.type !== "hourly_invoice") throw new Error("Not found.");
  if (payment.status !== "pending") throw new Error("This invoice has already been paid.");

  const [agreement] = await db.select().from(agreements).where(eq(agreements.id, payment.agreementId!));
  if (!agreement || agreement.clientUserId !== user.id) {
    throw new Error("Only the client can pay an invoice.");
  }

  const [developerProfile] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.id, agreement.developerProfileId));
  if (!developerProfile?.stripeAccountId || !developerProfile.stripeOnboardingComplete) {
    throw new Error("The developer hasn't finished connecting Stripe yet.");
  }

  const { session, platformFeeCents } = await createFundingCheckout({
    agreementId: agreement.id,
    amount: payment.amount,
    description: `Hourly invoice — ${agreement.id.slice(0, 8)}`,
    metadata: { paymentId: payment.id, agreementId: agreement.id },
    origin,
  });

  await db
    .update(payments)
    .set({ platformFeeAmount: (platformFeeCents / 100).toFixed(2) })
    .where(eq(payments.id, paymentId));

  redirect(session.url!);
}
