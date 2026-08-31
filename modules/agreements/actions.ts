"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agreements, developerProfiles, milestones, projects, changeRequests } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";

async function requireCurrentDbUser() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) {
    throw new Error("Could not resolve the signed-in user.");
  }
  return user;
}

// Which of the two parties (if either) the signed-in user is on this
// agreement — used to gate every action below.
async function requireAgreementParty(agreementId: string) {
  const user = await requireCurrentDbUser();

  const [agreement] = await db.select().from(agreements).where(eq(agreements.id, agreementId));
  if (!agreement) throw new Error("Not found.");

  const [developer] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.id, agreement.developerProfileId));

  const isClient = agreement.clientUserId === user.id;
  const isDeveloper = developer?.userId === user.id;
  if (!isClient && !isDeveloper) {
    throw new Error("Not found.");
  }

  return { agreement, isClient, isDeveloper, user };
}

// Both parties must explicitly accept before an agreement goes active (see
// modules/agreements/README.md) — this only ever sets the current user's own
// side, never both at once.
export async function acceptAgreement(agreementId: string) {
  const { agreement, isClient, isDeveloper } = await requireAgreementParty(agreementId);

  const patch = isClient
    ? { clientAcceptedAt: new Date() }
    : { developerAcceptedAt: new Date() };

  const clientAccepted = isClient ? true : agreement.clientAcceptedAt !== null;
  const developerAccepted = isDeveloper ? true : agreement.developerAcceptedAt !== null;

  await db
    .update(agreements)
    .set({
      ...patch,
      status: clientAccepted && developerAccepted ? "active" : agreement.status,
      updatedAt: new Date(),
    })
    .where(eq(agreements.id, agreementId));

  revalidatePath(`/agreements/${agreementId}`);
}

// Either party can mark an active agreement completed. In a fuller build
// this would follow from all milestones being paid out (see
// modules/payments/README.md), but that progression is intentionally
// deferred for now, so this is a direct action rather than a derived one.
export async function markAgreementCompleted(agreementId: string) {
  const { agreement } = await requireAgreementParty(agreementId);
  if (agreement.status !== "active") {
    throw new Error("Only an active agreement can be marked completed.");
  }

  await db
    .update(agreements)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(agreements.id, agreementId));

  await db.update(projects).set({ status: "completed" }).where(eq(projects.id, agreement.projectId));

  revalidatePath(`/agreements/${agreementId}`);
}

const changeRequestSchema = z.object({
  description: z.string().trim().min(3, "Describe the change").max(2000),
  amountDelta: z.coerce.number().optional(),
  timelineDeltaDays: z.coerce.number().int().optional(),
});

// A change request is never a silent edit to the agreement — it's its own
// row that, once the OTHER party approves it, is what updates
// scope/amount/timeline (modules/agreements/README.md). Deltas, not
// absolute values, so "what changed" stays legible in the audit trail.
export async function requestChange(formData: FormData) {
  const agreementId = formData.get("agreementId");
  if (typeof agreementId !== "string") throw new Error("Missing agreement.");

  const { agreement, user } = await requireAgreementParty(agreementId);

  if (agreement.status !== "active") {
    throw new Error("Can only request changes on an active agreement.");
  }

  const parsed = changeRequestSchema.safeParse({
    description: formData.get("description"),
    amountDelta: formData.get("amountDelta") || undefined,
    timelineDeltaDays: formData.get("timelineDeltaDays") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  await db.insert(changeRequests).values({
    agreementId,
    requestedByUserId: user.id,
    description: values.description,
    amountDelta: values.amountDelta?.toString(),
    timelineDeltaDays: values.timelineDeltaDays,
    status: "pending",
  });

  revalidatePath(`/agreements/${agreementId}`);
}

export async function respondToChangeRequest(formData: FormData) {
  const changeRequestId = formData.get("changeRequestId");
  const decision = formData.get("decision");
  if (typeof changeRequestId !== "string" || (decision !== "approve" && decision !== "decline")) {
    throw new Error("Invalid request.");
  }

  const [changeRequest] = await db.select().from(changeRequests).where(eq(changeRequests.id, changeRequestId));
  if (!changeRequest) throw new Error("Not found.");

  const { agreement, user } = await requireAgreementParty(changeRequest.agreementId);

  // Only the party who DIDN'T request it can approve/decline — otherwise a
  // change request would just be a silent self-edit.
  if (changeRequest.requestedByUserId === user.id) {
    throw new Error("You can't respond to your own change request.");
  }
  if (changeRequest.status !== "pending") {
    throw new Error("This change request has already been resolved.");
  }

  if (decision === "decline") {
    await db.update(changeRequests).set({ status: "declined" }).where(eq(changeRequests.id, changeRequestId));
    revalidatePath(`/agreements/${agreement.id}`);
    return;
  }

  const agreementUpdate: Partial<typeof agreements.$inferInsert> = { updatedAt: new Date() };
  if (changeRequest.amountDelta) {
    const delta = Number(changeRequest.amountDelta);
    if (agreement.budgetType === "hourly") {
      agreementUpdate.hourlyRate = (Number(agreement.hourlyRate ?? 0) + delta).toString();
    } else {
      agreementUpdate.totalAmount = (Number(agreement.totalAmount ?? 0) + delta).toString();
    }
  }
  if (changeRequest.timelineDeltaDays && agreement.targetCompletionDate) {
    const newDate = new Date(agreement.targetCompletionDate);
    newDate.setDate(newDate.getDate() + changeRequest.timelineDeltaDays);
    agreementUpdate.targetCompletionDate = newDate;
  }

  await db.update(agreements).set(agreementUpdate).where(eq(agreements.id, agreement.id));
  await db.update(changeRequests).set({ status: "approved" }).where(eq(changeRequests.id, changeRequestId));

  revalidatePath(`/agreements/${agreement.id}`);
}

const milestoneSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(200),
  description: z.string().trim().max(2000).optional(),
  amount: z.coerce.number().positive("Enter an amount"),
  dueDate: z.string().optional(),
});

// Client-only, and only while the agreement hasn't gone active yet — once
// both parties have accepted, changing terms is a change_request's job
// (modules/agreements/README.md), not a silent edit here.
export async function addMilestone(formData: FormData) {
  const agreementId = formData.get("agreementId");
  if (typeof agreementId !== "string") throw new Error("Missing agreement.");

  const { agreement, isClient } = await requireAgreementParty(agreementId);
  if (!isClient) throw new Error("Only the client can add milestones.");
  if (agreement.status !== "pending_acceptance" && agreement.status !== "draft") {
    throw new Error("Can't add milestones once the agreement is active.");
  }

  const parsed = milestoneSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  const existing = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(eq(milestones.agreementId, agreementId));

  await db.insert(milestones).values({
    agreementId,
    title: values.title,
    description: values.description,
    amount: values.amount.toString(),
    sortOrder: existing.length,
    dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
  });

  revalidatePath(`/agreements/${agreementId}`);
}
