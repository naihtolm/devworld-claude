import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { projectViews, projects, proposals } from "@/db/schema";

export type RecommendedProject = {
  id: string;
  title: string;
  category: string | null;
  budgetType: "fixed" | "milestone" | "hourly";
};

// Recency-weighted, category-based — "developers who viewed X also viewed
// projects like it" without a real similarity model. Recent view history is
// the only signal a new developer has, which is also why this returns []
// (rather than falling back to "recent projects") until they've actually
// looked at something: an unrelated project dressed up as a recommendation
// isn't more useful than no widget at all.
export async function getRecommendedProjects(
  userId: string,
  developerProfileId: string,
  limit = 3
): Promise<RecommendedProject[]> {
  const recentViews = await db
    .select({ projectId: projectViews.projectId, category: projects.category })
    .from(projectViews)
    .innerJoin(projects, eq(projectViews.projectId, projects.id))
    .where(eq(projectViews.userId, userId))
    .orderBy(desc(projectViews.createdAt))
    .limit(10);

  if (recentViews.length === 0) return [];

  const categories = [...new Set(recentViews.map((v) => v.category).filter((c): c is string => !!c))];
  if (categories.length === 0) return [];

  const proposedRows = await db
    .select({ projectId: proposals.projectId })
    .from(proposals)
    .where(eq(proposals.developerProfileId, developerProfileId));

  const excludedIds = [...new Set([...recentViews.map((v) => v.projectId), ...proposedRows.map((p) => p.projectId)])];

  return db
    .select({ id: projects.id, title: projects.title, category: projects.category, budgetType: projects.budgetType })
    .from(projects)
    .where(
      and(
        eq(projects.status, "published"),
        eq(projects.visibility, "public"),
        inArray(projects.category, categories),
        notInArray(projects.id, excludedIds)
      )
    )
    .orderBy(desc(projects.createdAt))
    .limit(limit);
}
