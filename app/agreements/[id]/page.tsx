import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { eq, asc, and } from "drizzle-orm";
import { db } from "@/db";
import { agreements, projects, developerProfiles, users, milestones, reviews, clientProfiles, payments, changeRequests } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { acceptAgreement, addMilestone, markAgreementCompleted, requestChange, respondToChangeRequest } from "@/modules/agreements/actions";
import { connectStripeAccount, fundMilestone, submitMilestoneWork, approveMilestone, submitHourlyInvoice, payHourlyInvoice } from "@/modules/payments/actions";
import { getOrCreateAgreementConversation } from "@/modules/messaging/actions";
import { submitReview } from "@/modules/reviews/actions";
import { openDispute } from "@/modules/admin/actions";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";
import { Avatar } from "@/modules/profiles/Avatar";
import { StatusBadge } from "@/modules/ui/StatusBadge";
import { StatusTimeline } from "@/modules/ui/StatusTimeline";
import { Button } from "@/modules/ui/Button";

export default async function AgreementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const { id } = await params;

  const [agreement] = await db.select().from(agreements).where(eq(agreements.id, id));
  if (!agreement) notFound();

  const [project] = await db.select().from(projects).where(eq(projects.id, agreement.projectId));
  const [developer] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.id, agreement.developerProfileId));
  const [developerUser] = developer
    ? await db.select().from(users).where(eq(users.id, developer.userId))
    : [];
  const [clientProfile] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, agreement.clientUserId));
  const [clientUser] = await db.select().from(users).where(eq(users.id, agreement.clientUserId));

  const currentUser = await ensureCurrentUser();
  const isClient = currentUser?.id === agreement.clientUserId;
  const isDeveloper = currentUser?.id === developerUser?.id;
  if (!isClient && !isDeveloper) {
    redirect("/projects");
  }

  const { name: developerClerkName, imageUrl: developerImageUrl } = await getClerkDisplay(
    developerUser?.authProviderId
  );
  const developerName = developerClerkName ?? developerUser?.email ?? "Developer";
  const { imageUrl: clientImageUrl } = await getClerkDisplay(clientUser?.authProviderId);

  const agreementMilestones = await db
    .select()
    .from(milestones)
    .where(eq(milestones.agreementId, id))
    .orderBy(asc(milestones.sortOrder));

  const canEditMilestones =
    isClient && (agreement.status === "draft" || agreement.status === "pending_acceptance");
  // Design language G-3: completion used to be a bare manual button,
  // disconnected from whether the work was actually done — someone could
  // mark it finished with milestones still unpaid, or a fully-paid
  // agreement could sit active indefinitely with nobody noticing. Surface
  // it as a real prompt once there's nothing left to pay out.
  const allMilestonesPaid =
    agreementMilestones.length > 0 && agreementMilestones.every((m) => m.status === "paid");
  const myAcceptedAt = isClient ? agreement.clientAcceptedAt : agreement.developerAcceptedAt;
  const developerStripeReady = developer?.stripeOnboardingComplete ?? false;

  const hourlyInvoices =
    agreement.budgetType === "hourly"
      ? await db
          .select()
          .from(payments)
          .where(and(eq(payments.agreementId, id), eq(payments.type, "hourly_invoice")))
          .orderBy(asc(payments.createdAt))
      : [];

  const agreementChangeRequests =
    agreement.status === "active"
      ? await db
          .select()
          .from(changeRequests)
          .where(eq(changeRequests.agreementId, id))
          .orderBy(asc(changeRequests.createdAt))
      : [];

  const agreementReviews =
    agreement.status === "completed"
      ? await db.select().from(reviews).where(eq(reviews.agreementId, id))
      : [];
  const myReview = agreementReviews.find((r) => r.reviewerUserId === currentUser?.id);
  const theirReview = agreementReviews.find((r) => r.reviewerUserId !== currentUser?.id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {project && (
        <Link href={`/projects/${project.id}`} className="mb-6 inline-block text-sm text-neutral-500 underline">
          ← Back to project
        </Link>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-h1">{project?.title ?? "Agreement"}</h1>
        <StatusBadge status={agreement.status} />
      </div>

      {agreement.status !== "cancelled" && (
        <div className="mb-6">
          <StatusTimeline status={agreement.status} />
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm text-neutral-500">
          <Avatar
            name={isClient ? developerName : (clientProfile?.displayName ?? "Client")}
            imageUrl={isClient ? developerImageUrl : clientImageUrl}
            size="sm"
          />
          with{" "}
          {isClient ? (
            <Link href={`/developers/${developer!.id}`} className="text-brand-600 underline">
              {developerName}
            </Link>
          ) : clientProfile ? (
            <Link href={`/clients/${clientProfile.id}`} className="text-brand-600 underline">
              the client
            </Link>
          ) : (
            "the client"
          )}
        </p>
        <form action={getOrCreateAgreementConversation.bind(null, agreement.id)}>
          <Button type="submit" variant="ghost" size="sm" className="p-0">
            Message {isClient ? developerName : "client"}
          </Button>
        </form>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-neutral-500">Budget type</dt>
          <dd className="font-medium capitalize">{agreement.budgetType}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Amount</dt>
          <dd className="font-medium">
            {agreement.budgetType === "hourly"
              ? `$${agreement.hourlyRate ?? "—"}/hr`
              : `$${agreement.totalAmount ?? "—"}`}
          </dd>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Scope</h2>
        <p className="whitespace-pre-wrap text-neutral-700">{agreement.scopeDescription}</p>
      </div>

      {agreement.budgetType !== "hourly" && (
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-500">Milestones</h2>
        </div>
        {agreementMilestones.length === 0 ? (
          <p className="text-sm text-neutral-400">No milestones yet.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {agreementMilestones.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-card border border-neutral-200 bg-white p-3 text-sm shadow-card"
              >
                <div>
                  <p className="font-medium">{m.title}</p>
                  {m.description && <p className="text-neutral-500">{m.description}</p>}
                </div>
                <div className="text-right">
                  <p className="mb-1 font-medium">${m.amount}</p>
                  {isClient && agreement.status === "active" && m.status === "pending" && (
                    developerStripeReady ? (
                      <form action={fundMilestone.bind(null, m.id)}>
                        <Button type="submit" size="sm">
                          Fund milestone
                        </Button>
                      </form>
                    ) : (
                      <p className="text-xs text-neutral-400">Waiting on developer&rsquo;s Stripe setup</p>
                    )
                  )}
                  {isDeveloper && m.status === "funded" && (
                    <form action={submitMilestoneWork.bind(null, m.id)}>
                      <Button type="submit" size="sm">
                        Submit work
                      </Button>
                    </form>
                  )}
                  {isClient && m.status === "submitted" && (
                    <form action={approveMilestone.bind(null, m.id)}>
                      <Button type="submit" size="sm">
                        Approve &amp; pay
                      </Button>
                    </form>
                  )}
                  {!(
                    (isClient && agreement.status === "active" && m.status === "pending") ||
                    (isDeveloper && m.status === "funded") ||
                    (isClient && m.status === "submitted")
                  ) && <StatusBadge status={m.status} />}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canEditMilestones && (
          <form action={addMilestone} className="space-y-3 rounded-md border border-dashed p-4">
            <input type="hidden" name="agreementId" value={agreement.id} />
            <div className="flex gap-3">
              <input
                name="title"
                required
                placeholder="Milestone title"
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                name="amount"
                type="number"
                min={0}
                step="0.01"
                required
                placeholder="Amount ($)"
                className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <textarea
              name="description"
              placeholder="Description (optional)"
              rows={2}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              name="dueDate"
              type="date"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <Button type="submit" variant="secondary" size="sm">
              Add milestone
            </Button>
          </form>
        )}
      </div>
      )}

      {agreement.budgetType === "hourly" && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-neutral-500">Hourly invoices</h2>
          {hourlyInvoices.length === 0 ? (
            <p className="mb-4 text-sm text-neutral-400">No invoices yet.</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {hourlyInvoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between rounded-card border border-neutral-200 bg-white p-3 text-sm shadow-card"
                >
                  <div>
                    <p className="font-medium">${inv.amount}</p>
                    <p className="text-neutral-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                  {isClient && inv.status === "pending" ? (
                    developerStripeReady ? (
                      <form action={payHourlyInvoice.bind(null, inv.id)}>
                        <Button type="submit" size="sm">
                          Pay invoice
                        </Button>
                      </form>
                    ) : (
                      <p className="text-xs text-neutral-400">Waiting on developer&rsquo;s Stripe setup</p>
                    )
                  ) : (
                    <StatusBadge status={inv.status} />
                  )}
                </li>
              ))}
            </ul>
          )}

          {isDeveloper && agreement.status === "active" && (
            <form action={submitHourlyInvoice} className="flex items-end gap-3 rounded-md border border-dashed p-4">
              <input type="hidden" name="agreementId" value={agreement.id} />
              <div>
                <label className="mb-1 block text-sm font-medium">Hours worked</label>
                <input
                  name="hours"
                  type="number"
                  min={0}
                  step="0.25"
                  required
                  className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Description (optional)</label>
                <input
                  name="description"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Submit invoice
              </Button>
            </form>
          )}
        </div>
      )}

      {agreement.status === "active" && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-neutral-500">Change requests</h2>
          {agreementChangeRequests.length > 0 && (
            <ul className="mb-4 space-y-2">
              {agreementChangeRequests.map((cr) => (
                <li
                  key={cr.id}
                  className="rounded-card border border-neutral-200 bg-white p-3 text-sm shadow-card"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium">{cr.description}</p>
                    <StatusBadge status={cr.status} />
                  </div>
                  <p className="mb-2 text-xs text-neutral-400">
                    {cr.amountDelta && `${Number(cr.amountDelta) > 0 ? "+" : ""}$${cr.amountDelta}`}
                    {cr.amountDelta && cr.timelineDeltaDays ? " · " : ""}
                    {cr.timelineDeltaDays &&
                      `${cr.timelineDeltaDays > 0 ? "+" : ""}${cr.timelineDeltaDays} days`}
                  </p>
                  {cr.status === "pending" && cr.requestedByUserId !== currentUser?.id && (
                    <div className="flex gap-3">
                      <form action={respondToChangeRequest}>
                        <input type="hidden" name="changeRequestId" value={cr.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <Button type="submit" size="sm">
                          Approve
                        </Button>
                      </form>
                      <form action={respondToChangeRequest}>
                        <input type="hidden" name="changeRequestId" value={cr.id} />
                        <input type="hidden" name="decision" value="decline" />
                        <Button type="submit" variant="secondary" size="sm">
                          Decline
                        </Button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <details className="text-sm">
            <summary className="cursor-pointer text-brand-600 underline">Request a change</summary>
            <form action={requestChange} className="mt-3 space-y-3 rounded-md border border-dashed p-4">
              <input type="hidden" name="agreementId" value={agreement.id} />
              <div>
                <label className="mb-1 block text-sm font-medium">What&rsquo;s changing</label>
                <textarea
                  name="description"
                  required
                  rows={2}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Amount change ($, optional)</label>
                  <input
                    name="amountDelta"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 200 or -50"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Timeline change (days, optional)</label>
                  <input
                    name="timelineDeltaDays"
                    type="number"
                    placeholder="e.g. 5 or -2"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Submit request
              </Button>
            </form>
          </details>
        </div>
      )}

      {isDeveloper && agreement.status === "active" && !developerStripeReady && (
        <form action={connectStripeAccount} className="mb-4">
          <Button type="submit">Connect Stripe to receive payments</Button>
        </form>
      )}

      {agreement.status === "active" && allMilestonesPaid && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-card border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-800">
            Every milestone is paid — nothing left outstanding on this agreement.
          </p>
          <form action={markAgreementCompleted.bind(null, agreement.id)}>
            <Button type="submit" size="sm">
              Mark completed
            </Button>
          </form>
        </div>
      )}

      {agreement.status === "active" && !allMilestonesPaid && (
        <div className="mb-4 flex items-center gap-3">
          <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Active — both parties have accepted.
          </p>
          <form action={markAgreementCompleted.bind(null, agreement.id)}>
            <Button type="submit" variant="ghost" size="sm" className="p-0">
              Mark as completed
            </Button>
          </form>
        </div>
      )}

      {agreement.status === "completed" && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-neutral-500">Reviews</h2>
          {theirReview && (
            <div className="mb-3 rounded-card border border-neutral-200 bg-white p-3 text-sm shadow-card">
              <p className="mb-1 font-medium text-amber-500">
                {"★".repeat(theirReview.rating)}
                <span className="text-neutral-300">{"★".repeat(5 - theirReview.rating)}</span>
              </p>
              {theirReview.comment && <p className="text-neutral-600">{theirReview.comment}</p>}
            </div>
          )}
          {myReview ? (
            <p className="text-sm text-neutral-400">You&rsquo;ve left your review.</p>
          ) : (
            <form action={submitReview} className="space-y-3 rounded-md border border-dashed p-4">
              <input type="hidden" name="agreementId" value={agreement.id} />
              <div>
                <label className="mb-1 block text-sm font-medium">Rating</label>
                <select name="rating" required defaultValue="5" className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} star{n === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                name="comment"
                placeholder="How did it go? (optional)"
                rows={3}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              <Button type="submit" size="sm">
                Submit review
              </Button>
            </form>
          )}
        </div>
      )}

      {agreement.status !== "active" && agreement.status !== "completed" && agreement.status !== "disputed" && (
        myAcceptedAt ? (
          <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You&rsquo;ve accepted. Waiting on the other party.
          </p>
        ) : (
          <form action={acceptAgreement.bind(null, agreement.id)}>
            <Button type="submit">Accept agreement</Button>
          </form>
        )
      )}

      {agreement.status === "disputed" && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          Under dispute — an admin is reviewing this agreement.
        </p>
      )}

      {(agreement.status === "active" || agreement.status === "completed") && (
        <details className="mt-8 text-sm">
          <summary className="cursor-pointer text-neutral-400 underline">Open a dispute</summary>
          <form action={openDispute} className="mt-3 space-y-3 rounded-md border border-dashed p-4">
            <input type="hidden" name="agreementId" value={agreement.id} />
            <div>
              <label className="mb-1 block text-sm font-medium">Reason</label>
              <input
                name="reason"
                required
                maxLength={150}
                placeholder="Short summary"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Details (optional)</label>
              <textarea
                name="description"
                rows={3}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Open dispute
            </Button>
          </form>
        </details>
      )}
    </main>
  );
}
