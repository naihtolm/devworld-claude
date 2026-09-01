"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agreements, developerProfiles, disputes, adminActions, users, reports } from "@/db/schema";
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

async function requireAdmin() {
  const user = await requireCurrentDbUser();
  const [row] = await db.select().from(users).where(eq(users.id, user.id));
  if (!row?.isAdmin) throw new Error("Not found.");
  return row;
}

const disputeSchema = z.object({
  agreementId: z.string().uuid(),
  reason: z.string().trim().min(3, "Give a short reason").max(150),
  description: z.string().trim().max(4000).optional(),
});

// V1 is admin-assisted, not automated (modules/admin/README.md): a party
// opens a dispute, an admin reviews the linked agreement + message history
// and records a resolution.
export async function openDispute(formData: FormData) {
  const parsed = disputeSchema.safeParse({
    agreementId: formData.get("agreementId"),
    reason: formData.get("reason"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  const user = await requireCurrentDbUser();

  const [agreement] = await db.select().from(agreements).where(eq(agreements.id, values.agreementId));
  if (!agreement) throw new Error("Not found.");

  const [developer] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.id, agreement.developerProfileId));
  const isParty = agreement.clientUserId === user.id || developer?.userId === user.id;
  if (!isParty) throw new Error("Not found.");

  await db.insert(disputes).values({
    agreementId: values.agreementId,
    openedByUserId: user.id,
    reason: values.reason,
    description: values.description,
    status: "open",
  });

  await db.update(agreements).set({ status: "disputed" }).where(eq(agreements.id, values.agreementId));

  revalidatePath(`/agreements/${values.agreementId}`);
}

const resolveDisputeSchema = z.object({
  disputeId: z.string().uuid(),
  resolution: z.string().trim().min(3, "Describe the resolution").max(4000),
});

export async function resolveDispute(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = resolveDisputeSchema.safeParse({
    disputeId: formData.get("disputeId"),
    resolution: formData.get("resolution"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  const [dispute] = await db.select().from(disputes).where(eq(disputes.id, values.disputeId));
  if (!dispute) throw new Error("Not found.");

  await db
    .update(disputes)
    .set({
      status: "resolved",
      resolution: values.resolution,
      resolvedByAdminId: admin.id,
      updatedAt: new Date(),
    })
    .where(eq(disputes.id, values.disputeId));

  // Audit log — every moderation action gets a row (modules/admin/README.md).
  await db.insert(adminActions).values({
    adminUserId: admin.id,
    actionType: "resolve_dispute",
    targetType: "dispute",
    targetId: dispute.id,
    notes: values.resolution,
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/disputes/${values.disputeId}`);
}

const reportSchema = z.object({
  targetType: z.enum(["user", "project", "review", "message"]),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(3, "Give a short reason").max(150),
});

// Distinct from a dispute: a report flags content/a user for moderation
// review, it isn't tied to a specific agreement and doesn't need the other
// party involved (modules/admin/README.md's reports table).
export async function openReport(formData: FormData) {
  const user = await requireCurrentDbUser();

  const parsed = reportSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  await db.insert(reports).values({
    reporterUserId: user.id,
    targetType: values.targetType,
    targetId: values.targetId,
    reason: values.reason,
    status: "open",
  });

  revalidatePath(`/admin/reports`);
}

const updateReportSchema = z.object({
  reportId: z.string().uuid(),
  decision: z.enum(["reviewed", "dismissed", "actioned"]),
  notes: z.string().trim().max(2000).optional(),
});

export async function updateReportStatus(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = updateReportSchema.safeParse({
    reportId: formData.get("reportId"),
    decision: formData.get("decision"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  const [report] = await db.select().from(reports).where(eq(reports.id, values.reportId));
  if (!report) throw new Error("Not found.");

  await db.update(reports).set({ status: values.decision }).where(eq(reports.id, values.reportId));

  await db.insert(adminActions).values({
    adminUserId: admin.id,
    actionType: `report_${values.decision}`,
    targetType: "report",
    targetId: report.id,
    notes: values.notes,
  });

  revalidatePath("/admin/reports");
}
