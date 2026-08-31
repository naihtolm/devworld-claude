"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  proposals,
  projects,
  developerProfiles,
  agreements,
  invitations,
} from "@/db/schema";
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

// A user isn't fixed as "client" or "developer" (see modules/auth/README.md)
// — submitting a proposal is itself enough intent to gain a developer
// profile if the user doesn't already have one from onboarding.
async function ensureDeveloperProfile(userId: string) {
  await db.insert(developerProfiles).values({ userId }).onConflictDoNothing();
  const [profile] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.userId, userId));
  return profile;
}

const submitProposalSchema = z.object({
  projectId: z.string().uuid(),
  introduction: z.string().trim().min(20, "Tell the client a bit more about your approach"),
  proposedAmount: z.coerce.number().positive("Enter a proposed amount"),
  proposedRateType: z.enum(["fixed", "milestone", "hourly"]),
  estimatedTimelineDays: z.coerce.number().int().positive().optional(),
});

export async function submitProposal(formData: FormData) {
  const user = await requireCurrentDbUser();
  const developerProfile = await ensureDeveloperProfile(user.id);

  const parsed = submitProposalSchema.safeParse({
    projectId: formData.get("projectId"),
    introduction: formData.get("introduction"),
    proposedAmount: formData.get("proposedAmount"),
    proposedRateType: formData.get("proposedRateType"),
    estimatedTimelineDays: formData.get("estimatedTimelineDays") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  const [project] = await db.select().from(projects).where(eq(projects.id, values.projectId));
  if (!project || project.status !== "published") {
    throw new Error("This project isn't accepting proposals.");
  }

  try {
    await db.insert(proposals).values({
      projectId: values.projectId,
      developerProfileId: developerProfile.id,
      introduction: values.introduction,
      proposedAmount: values.proposedAmount.toString(),
      proposedRateType: values.proposedRateType,
      estimatedTimelineDays: values.estimatedTimelineDays,
      status: "submitted",
    });
  } catch {
    // Unique index on (projectId, developerProfileId) — see db/schema.ts
    throw new Error("You've already submitted a proposal for this project.");
  }

  redirect(`/projects/${values.projectId}`);
}

async function requireProjectOwner(proposalId: string) {
  const user = await requireCurrentDbUser();

  const [row] = await db
    .select({ proposal: proposals, project: projects })
    .from(proposals)
    .innerJoin(projects, eq(proposals.projectId, projects.id))
    .where(eq(proposals.id, proposalId));

  if (!row || row.project.clientUserId !== user.id) {
    throw new Error("Not found.");
  }
  return row;
}

export async function shortlistProposal(proposalId: string) {
  const { project } = await requireProjectOwner(proposalId);
  await db.update(proposals).set({ status: "shortlisted" }).where(eq(proposals.id, proposalId));
  revalidatePath(`/projects/${project.id}/proposals`);
}

export async function declineProposal(proposalId: string) {
  const { project } = await requireProjectOwner(proposalId);
  await db.update(proposals).set({ status: "declined" }).where(eq(proposals.id, proposalId));
  revalidatePath(`/projects/${project.id}/proposals`);
}

// Accepting is the handoff into the agreements module (see
// modules/proposals/README.md) — creates a draft agreement rather than
// implicitly wiring the two together. The agreements module owns everything
// from here (both-party acceptance, milestones, etc.).
export async function acceptProposal(proposalId: string) {
  const { proposal, project } = await requireProjectOwner(proposalId);

  // Starts at pending_acceptance rather than draft — the client accepting a
  // proposal is itself the clear-intent step; from here both parties still
  // need to explicitly accept the agreement terms (see modules/agreements).
  const [agreement] = await db
    .insert(agreements)
    .values({
      projectId: project.id,
      proposalId: proposal.id,
      clientUserId: project.clientUserId,
      developerProfileId: proposal.developerProfileId,
      scopeDescription: project.description,
      budgetType: proposal.proposedRateType,
      totalAmount: proposal.proposedRateType === "hourly" ? undefined : proposal.proposedAmount ?? undefined,
      hourlyRate: proposal.proposedRateType === "hourly" ? proposal.proposedAmount ?? undefined : undefined,
      status: "pending_acceptance",
    })
    .returning();

  await db
    .update(proposals)
    .set({ status: "accepted" })
    .where(eq(proposals.id, proposalId));

  await db
    .update(projects)
    .set({ status: "agreement_pending" })
    .where(eq(projects.id, project.id));

  redirect(`/agreements/${agreement.id}`);
}

// Direct invitations: a client inviting a specific developer from their
// profile, rather than waiting for a proposal (see
// modules/proposals/README.md). Only the client's own published projects
// are selectable — this is also the only path into an invite_only project,
// since those don't show a public "Submit Proposal" button.
const sendInvitationSchema = z.object({
  projectId: z.string().uuid(),
  developerProfileId: z.string().uuid(),
  message: z.string().trim().max(2000).optional(),
});

export async function sendInvitation(formData: FormData) {
  const user = await requireCurrentDbUser();

  const parsed = sendInvitationSchema.safeParse({
    projectId: formData.get("projectId"),
    developerProfileId: formData.get("developerProfileId"),
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  const [project] = await db.select().from(projects).where(eq(projects.id, values.projectId));
  if (!project || project.clientUserId !== user.id) {
    throw new Error("Not found.");
  }
  if (project.status !== "published") {
    throw new Error("Only published projects can be used to invite a developer.");
  }

  await db.insert(invitations).values({
    projectId: values.projectId,
    developerProfileId: values.developerProfileId,
    invitedByUserId: user.id,
    message: values.message,
    status: "sent",
  });

  revalidatePath(`/developers/${values.developerProfileId}`);
}

async function requireInvitationOwner(invitationId: string) {
  const user = await requireCurrentDbUser();

  const [row] = await db
    .select({ invitation: invitations, developer: developerProfiles })
    .from(invitations)
    .innerJoin(developerProfiles, eq(invitations.developerProfileId, developerProfiles.id))
    .where(eq(invitations.id, invitationId));

  if (!row || row.developer.userId !== user.id) {
    throw new Error("Not found.");
  }
  return row;
}

// Accepting doesn't skip straight to an agreement — the invitation doesn't
// carry proposed terms, so the developer still submits a real proposal
// (with their own amount/timeline) for the client to accept from there.
export async function acceptInvitation(invitationId: string) {
  const { invitation } = await requireInvitationOwner(invitationId);
  await db.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, invitationId));
  redirect(`/projects/${invitation.projectId}/proposals/new`);
}

export async function declineInvitation(invitationId: string) {
  const { invitation } = await requireInvitationOwner(invitationId);
  await db.update(invitations).set({ status: "declined" }).where(eq(invitations.id, invitationId));
  revalidatePath("/invitations");
}
