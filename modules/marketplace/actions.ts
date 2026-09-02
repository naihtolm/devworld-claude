"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { inArray, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { projects, projectSkills, projectAttachments, skills, companyMemberships } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { uploadProjectAttachment } from "@/modules/marketplace/storage";

async function requireCurrentDbUser() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) {
    throw new Error("Could not resolve the signed-in user.");
  }
  return user;
}

const projectFormSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(200),
  description: z.string().trim().min(20, "Description is too short"),
  category: z.string().trim().min(1, "Choose a category"),
  budgetType: z.enum(["fixed", "milestone", "hourly"]),
  budgetMin: z.coerce.number().nonnegative().optional(),
  budgetMax: z.coerce.number().nonnegative().optional(),
  timelineDays: z.coerce.number().int().positive().optional(),
  visibility: z.enum(["public", "invite_only"]),
  skillNames: z.array(z.string().trim().min(1)).max(20),
  companyId: z.string().uuid().optional(),
});

// Skills are stored as structured rows (see db/schema.ts), not free text —
// this normalizes whatever the tag input submitted into `skills` rows,
// creating new ones as needed, so search/matching works later without
// requiring a pre-seeded taxonomy up front.
async function resolveSkillIds(names: string[]) {
  const uniqueNames = [...new Set(names.map((n) => n.toLowerCase()))].filter(Boolean);
  if (uniqueNames.length === 0) return [];

  await db
    .insert(skills)
    .values(uniqueNames.map((name) => ({ name })))
    .onConflictDoNothing();

  const rows = await db
    .select({ id: skills.id })
    .from(skills)
    .where(inArray(skills.name, uniqueNames));
  return rows.map((r) => r.id);
}

export async function createProject(formData: FormData) {
  const user = await requireCurrentDbUser();

  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    budgetType: formData.get("budgetType"),
    budgetMin: formData.get("budgetMin") || undefined,
    budgetMax: formData.get("budgetMax") || undefined,
    timelineDays: formData.get("timelineDays") || undefined,
    visibility: formData.get("visibility"),
    skillNames: formData.getAll("skillNames").map(String),
    companyId: formData.get("companyId") || undefined,
  };

  const parsed = projectFormSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  // Posting as a company requires actually belonging to it — never trust a
  // companyId submitted from the client without checking membership.
  let companyId: string | undefined;
  if (values.companyId) {
    const [membership] = await db
      .select()
      .from(companyMemberships)
      .where(and(eq(companyMemberships.companyId, values.companyId), eq(companyMemberships.userId, user.id)));
    if (membership) companyId = values.companyId;
  }

  const intent = formData.get("intent"); // "draft" | "publish"
  const status = intent === "publish" ? "published" : "draft";

  const skillIds = await resolveSkillIds(values.skillNames);

  const [project] = await db
    .insert(projects)
    .values({
      clientUserId: user.id,
      companyId,
      title: values.title,
      description: values.description,
      category: values.category,
      budgetType: values.budgetType,
      budgetMin: values.budgetMin?.toString(),
      budgetMax: values.budgetMax?.toString(),
      timelineDays: values.timelineDays,
      visibility: values.visibility,
      status,
    })
    .returning();

  if (skillIds.length > 0) {
    await db
      .insert(projectSkills)
      .values(skillIds.map((skillId) => ({ projectId: project.id, skillId })));
  }

  const files = formData.getAll("attachments").filter(
    (f): f is File => f instanceof File && f.size > 0
  );
  if (files.length > 0) {
    const uploaded = await Promise.all(
      files.map((file) => uploadProjectAttachment(file, project.id))
    );
    await db.insert(projectAttachments).values(
      uploaded.map((u) => ({ projectId: project.id, fileUrl: u.fileUrl, filename: u.filename }))
    );
  }

  // Design language G-2: land the client on their own new listing, not the
  // general marketplace they'd have to go hunt through it in.
  redirect(status === "published" ? `/projects/${project.id}?published=1` : `/projects/${project.id}/edit?saved=draft`);
}

// Design language G-1: "Save Draft" used to be a dead end — createProject
// was the only project-write action, so a draft could never be found or
// finished again. This is that missing second half.
export async function updateProject(projectId: string, formData: FormData) {
  const user = await requireCurrentDbUser();

  const [existing] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!existing || existing.clientUserId !== user.id) {
    throw new Error("Not found.");
  }
  if (existing.status !== "draft") {
    throw new Error("Only a draft can be edited here.");
  }

  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    budgetType: formData.get("budgetType"),
    budgetMin: formData.get("budgetMin") || undefined,
    budgetMax: formData.get("budgetMax") || undefined,
    timelineDays: formData.get("timelineDays") || undefined,
    visibility: formData.get("visibility"),
    skillNames: formData.getAll("skillNames").map(String),
    companyId: formData.get("companyId") || undefined,
  };

  const parsed = projectFormSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  let companyId: string | undefined;
  if (values.companyId) {
    const [membership] = await db
      .select()
      .from(companyMemberships)
      .where(and(eq(companyMemberships.companyId, values.companyId), eq(companyMemberships.userId, user.id)));
    if (membership) companyId = values.companyId;
  }

  const intent = formData.get("intent"); // "draft" | "publish"
  const status = intent === "publish" ? "published" : "draft";

  const skillIds = await resolveSkillIds(values.skillNames);

  await db
    .update(projects)
    .set({
      companyId,
      title: values.title,
      description: values.description,
      category: values.category,
      budgetType: values.budgetType,
      budgetMin: values.budgetMin?.toString(),
      budgetMax: values.budgetMax?.toString(),
      timelineDays: values.timelineDays,
      visibility: values.visibility,
      status,
    })
    .where(eq(projects.id, projectId));

  // Re-sync skills rather than diff them — simplest correct approach for a
  // form that resubmits the full skill list each time.
  await db.delete(projectSkills).where(eq(projectSkills.projectId, projectId));
  if (skillIds.length > 0) {
    await db.insert(projectSkills).values(skillIds.map((skillId) => ({ projectId, skillId })));
  }

  const files = formData.getAll("attachments").filter(
    (f): f is File => f instanceof File && f.size > 0
  );
  if (files.length > 0) {
    const uploaded = await Promise.all(files.map((file) => uploadProjectAttachment(file, projectId)));
    await db.insert(projectAttachments).values(
      uploaded.map((u) => ({ projectId, fileUrl: u.fileUrl, filename: u.filename }))
    );
  }

  redirect(status === "published" ? `/projects/${projectId}?published=1` : `/projects/${projectId}/edit?saved=draft`);
}
