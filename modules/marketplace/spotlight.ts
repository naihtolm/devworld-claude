import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { agreements, projects, developerProfiles, users, companies, reviews } from "@/db/schema";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";

export { meetsFeaturedThreshold } from "@/modules/marketplace/spotlightThreshold";

export type RecentCompletedWork = {
  agreementId: string;
  projectId: string;
  projectTitle: string;
  category: string | null;
  developerName: string;
  clientName: string;
};

// Links must go to /projects/[id] (public) — never /agreements/[id], which
// redirects anyone who isn't a party to that agreement.
export async function getRecentCompletedWork(limit = 3): Promise<RecentCompletedWork[]> {
  const rows = await db
    .select({ agreement: agreements, project: projects, developerProfile: developerProfiles, company: companies })
    .from(agreements)
    .innerJoin(projects, eq(agreements.projectId, projects.id))
    .innerJoin(developerProfiles, eq(agreements.developerProfileId, developerProfiles.id))
    .leftJoin(companies, eq(projects.companyId, companies.id))
    .where(eq(agreements.status, "completed"))
    .orderBy(desc(agreements.updatedAt))
    .limit(limit);

  const result: RecentCompletedWork[] = [];
  for (const row of rows) {
    const [developerUser] = await db.select().from(users).where(eq(users.id, row.developerProfile.userId));
    const { name } = await getClerkDisplay(developerUser?.authProviderId);
    result.push({
      agreementId: row.agreement.id,
      projectId: row.project.id,
      projectTitle: row.project.title,
      category: row.project.category,
      developerName: name ?? developerUser?.email ?? "A developer",
      clientName: row.company?.name ?? "a client",
    });
  }
  return result;
}

export type FeaturedDeveloper = {
  id: string;
  headline: string | null;
  name: string;
  reviewCount: number;
  averageRating: number;
};

// Ranked by volume then rating, with a floor — below minReviews there
// isn't enough signal to call someone "featured", so this returns [] rather
// than falling back to an unranked list dressed up as one.
export async function getFeaturedDevelopers(limit = 3, minReviews = 2): Promise<FeaturedDeveloper[]> {
  const rows = await db
    .select({
      developerProfile: developerProfiles,
      reviewCount: sql<string>`count(${reviews.id})`,
      averageRating: sql<string>`avg(${reviews.rating})`,
    })
    .from(developerProfiles)
    .innerJoin(reviews, eq(reviews.revieweeUserId, developerProfiles.userId))
    .groupBy(developerProfiles.id)
    .having(sql`count(${reviews.id}) >= ${minReviews}`)
    .orderBy(desc(sql`count(${reviews.id})`), desc(sql`avg(${reviews.rating})`))
    .limit(limit);

  const result: FeaturedDeveloper[] = [];
  for (const row of rows) {
    const [user] = await db.select().from(users).where(eq(users.id, row.developerProfile.userId));
    const { name } = await getClerkDisplay(user?.authProviderId);
    result.push({
      id: row.developerProfile.id,
      headline: row.developerProfile.headline,
      name: name ?? user?.email ?? "A developer",
      reviewCount: Number(row.reviewCount),
      averageRating: Number(row.averageRating),
    });
  }
  return result;
}

export type FeaturedCompany = {
  id: string;
  name: string;
  industry: string | null;
  projectCount: number;
};

export async function getFeaturedCompanies(limit = 3, minProjects = 2): Promise<FeaturedCompany[]> {
  const rows = await db
    .select({
      company: companies,
      projectCount: sql<string>`count(${projects.id})`,
    })
    .from(companies)
    .innerJoin(
      projects,
      and(eq(projects.companyId, companies.id), inArray(projects.status, ["published", "completed"]))
    )
    .groupBy(companies.id)
    .having(sql`count(${projects.id}) >= ${minProjects}`)
    .orderBy(desc(sql`count(${projects.id})`))
    .limit(limit);

  return rows.map((r) => ({
    id: r.company.id,
    name: r.company.name,
    industry: r.company.industry,
    projectCount: Number(r.projectCount),
  }));
}
