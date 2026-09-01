"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, inArray, and } from "drizzle-orm";
import { db } from "@/db";
import {
  clientProfiles,
  developerProfiles,
  developerSkills,
  skills,
  portfolioItems,
  companies,
  companyMemberships,
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

// Onboarding choice creates one profile without closing off the other —
// a user can end up with both a client and a developer profile later.
export async function chooseHiring() {
  const user = await requireCurrentDbUser();
  await db.insert(clientProfiles).values({ userId: user.id }).onConflictDoNothing();
  redirect("/projects");
}

export async function chooseDeveloper() {
  const user = await requireCurrentDbUser();
  await db.insert(developerProfiles).values({ userId: user.id }).onConflictDoNothing();
  redirect("/projects");
}

async function ensureDeveloperProfile(userId: string) {
  await db.insert(developerProfiles).values({ userId }).onConflictDoNothing();
  const [profile] = await db.select().from(developerProfiles).where(eq(developerProfiles.userId, userId));
  return profile;
}

async function ensureClientProfile(userId: string) {
  await db.insert(clientProfiles).values({ userId }).onConflictDoNothing();
  const [profile] = await db.select().from(clientProfiles).where(eq(clientProfiles.userId, userId));
  return profile;
}

// Same normalization approach as project skill tags (modules/marketplace):
// selected from + upserted into the shared skills table rather than stored
// as free text — see modules/profiles/README.md.
async function resolveSkillIds(names: string[]) {
  const uniqueNames = [...new Set(names.map((n) => n.toLowerCase().trim()))].filter(Boolean);
  if (uniqueNames.length === 0) return [];

  await db.insert(skills).values(uniqueNames.map((name) => ({ name }))).onConflictDoNothing();

  const rows = await db.select({ id: skills.id }).from(skills).where(inArray(skills.name, uniqueNames));
  return rows.map((r) => r.id);
}

const developerProfileSchema = z.object({
  headline: z.string().trim().max(150).optional(),
  bio: z.string().trim().max(4000).optional(),
  location: z.string().trim().max(150).optional(),
  timezone: z.string().trim().max(50).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  hourlyRate: z.coerce.number().nonnegative().optional(),
  projectStartingPrice: z.coerce.number().nonnegative().optional(),
  availability: z.enum(["available", "limited", "unavailable"]).optional(),
  githubUsername: z.string().trim().max(100).optional(),
  gitlabUsername: z.string().trim().max(100).optional(),
  linkedinUrl: z.string().trim().max(2000).optional(),
  websiteUrl: z.string().trim().max(2000).optional(),
  skillNames: z.array(z.string().trim().min(1)).max(20),
});

export async function updateDeveloperProfile(formData: FormData) {
  const user = await requireCurrentDbUser();
  const profile = await ensureDeveloperProfile(user.id);

  const parsed = developerProfileSchema.safeParse({
    headline: formData.get("headline") || undefined,
    bio: formData.get("bio") || undefined,
    location: formData.get("location") || undefined,
    timezone: formData.get("timezone") || undefined,
    yearsExperience: formData.get("yearsExperience") || undefined,
    hourlyRate: formData.get("hourlyRate") || undefined,
    projectStartingPrice: formData.get("projectStartingPrice") || undefined,
    availability: formData.get("availability") || undefined,
    githubUsername: formData.get("githubUsername") || undefined,
    gitlabUsername: formData.get("gitlabUsername") || undefined,
    linkedinUrl: formData.get("linkedinUrl") || undefined,
    websiteUrl: formData.get("websiteUrl") || undefined,
    skillNames: formData.getAll("skillNames").map(String),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  await db
    .update(developerProfiles)
    .set({
      headline: values.headline,
      bio: values.bio,
      location: values.location,
      timezone: values.timezone,
      yearsExperience: values.yearsExperience,
      hourlyRate: values.hourlyRate?.toString(),
      projectStartingPrice: values.projectStartingPrice?.toString(),
      availability: values.availability,
      githubUsername: values.githubUsername,
      gitlabUsername: values.gitlabUsername,
      linkedinUrl: values.linkedinUrl,
      websiteUrl: values.websiteUrl,
      updatedAt: new Date(),
    })
    .where(eq(developerProfiles.id, profile.id));

  const skillIds = await resolveSkillIds(values.skillNames);
  await db.delete(developerSkills).where(eq(developerSkills.developerProfileId, profile.id));
  if (skillIds.length > 0) {
    await db
      .insert(developerSkills)
      .values(skillIds.map((skillId) => ({ developerProfileId: profile.id, skillId })));
  }

  revalidatePath(`/developers/${profile.id}`);
  redirect(`/developers/${profile.id}`);
}

const clientProfileSchema = z.object({
  displayName: z.string().trim().max(150).optional(),
  bio: z.string().trim().max(4000).optional(),
  location: z.string().trim().max(150).optional(),
});

export async function updateClientProfile(formData: FormData) {
  const user = await requireCurrentDbUser();
  const profile = await ensureClientProfile(user.id);

  const parsed = clientProfileSchema.safeParse({
    displayName: formData.get("displayName") || undefined,
    bio: formData.get("bio") || undefined,
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  await db.update(clientProfiles).set(parsed.data).where(eq(clientProfiles.id, profile.id));

  revalidatePath(`/clients/${profile.id}`);
  redirect(`/clients/${profile.id}`);
}

const portfolioItemSchema = z.object({
  title: z.string().trim().min(2, "Title is too short").max(150),
  description: z.string().trim().max(2000).optional(),
  role: z.string().trim().max(150).optional(),
  technologies: z.array(z.string().trim().min(1)).max(15),
  externalUrl: z.string().trim().max(2000).optional(),
  repoUrl: z.string().trim().max(2000).optional(),
});

export async function addPortfolioItem(formData: FormData) {
  const user = await requireCurrentDbUser();
  const profile = await ensureDeveloperProfile(user.id);

  const parsed = portfolioItemSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    role: formData.get("role") || undefined,
    technologies: formData.getAll("technologies").map(String),
    externalUrl: formData.get("externalUrl") || undefined,
    repoUrl: formData.get("repoUrl") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  await db.insert(portfolioItems).values({
    developerProfileId: profile.id,
    title: values.title,
    description: values.description,
    role: values.role,
    technologies: values.technologies,
    externalUrl: values.externalUrl,
    repoUrl: values.repoUrl,
  });

  revalidatePath(`/developers/${profile.id}`);
}

const githubRepoSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).optional(),
  language: z.string().trim().max(50).optional(),
  url: z.string().trim().max(2000),
});

// Each checked repo's data travels as a JSON string in its checkbox value
// (see modules/profiles/github.ts) — no extra GitHub API round-trip needed,
// and no elevated trust concern since a developer can already freely type
// any title/description into a portfolio item via addPortfolioItem above.
export async function importGitHubRepos(formData: FormData) {
  const user = await requireCurrentDbUser();
  const profile = await ensureDeveloperProfile(user.id);

  const raw = formData.getAll("repos");
  const items = raw
    .map((r) => {
      try {
        return githubRepoSchema.parse(JSON.parse(String(r)));
      } catch {
        return null;
      }
    })
    .filter((r): r is z.infer<typeof githubRepoSchema> => r !== null);

  if (items.length === 0) return;

  const existing = await db
    .select({ repoUrl: portfolioItems.repoUrl })
    .from(portfolioItems)
    .where(eq(portfolioItems.developerProfileId, profile.id));
  const existingUrls = new Set(existing.map((e) => e.repoUrl));

  const toInsert = items.filter((r) => !existingUrls.has(r.url));
  if (toInsert.length > 0) {
    await db.insert(portfolioItems).values(
      toInsert.map((r) => ({
        developerProfileId: profile.id,
        title: r.name,
        description: r.description,
        technologies: r.language ? [r.language] : [],
        repoUrl: r.url,
      }))
    );
  }

  revalidatePath(`/developers/${profile.id}`);
}

export async function deletePortfolioItem(portfolioItemId: string) {
  const user = await requireCurrentDbUser();
  const profile = await ensureDeveloperProfile(user.id);

  await db
    .delete(portfolioItems)
    .where(and(eq(portfolioItems.id, portfolioItemId), eq(portfolioItems.developerProfileId, profile.id)));

  revalidatePath(`/developers/${profile.id}`);
}

const companySchema = z.object({
  name: z.string().trim().min(2, "Company name is too short").max(150),
  description: z.string().trim().max(4000).optional(),
  website: z.string().trim().max(2000).optional(),
  industry: z.string().trim().max(100).optional(),
  size: z.string().trim().max(50).optional(),
  location: z.string().trim().max(150).optional(),
});

// Creating a company makes the current user its owner — the one membership
// role allowed to edit the company itself (modules/profiles README's
// companies/company_memberships tables).
export async function createCompany(formData: FormData) {
  const user = await requireCurrentDbUser();

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    website: formData.get("website") || undefined,
    industry: formData.get("industry") || undefined,
    size: formData.get("size") || undefined,
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const [company] = await db.insert(companies).values(parsed.data).returning();
  await db.insert(companyMemberships).values({ companyId: company.id, userId: user.id, role: "owner" });

  redirect(`/companies/${company.id}`);
}

async function requireCompanyOwnerOrAdmin(companyId: string) {
  const user = await requireCurrentDbUser();

  const [membership] = await db
    .select()
    .from(companyMemberships)
    .where(and(eq(companyMemberships.companyId, companyId), eq(companyMemberships.userId, user.id)));

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Not found.");
  }
  return user;
}

export async function updateCompany(formData: FormData) {
  const companyId = formData.get("companyId");
  if (typeof companyId !== "string") throw new Error("Missing company.");
  await requireCompanyOwnerOrAdmin(companyId);

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    website: formData.get("website") || undefined,
    industry: formData.get("industry") || undefined,
    size: formData.get("size") || undefined,
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  await db.update(companies).set(parsed.data).where(eq(companies.id, companyId));

  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}`);
}
