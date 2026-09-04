import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { proposals, projects } from "@/db/schema";
import type { RateTrendRow } from "./rateTrendsShape";

export * from "./rateTrendsShape";

// Uses proposed hourly rates, not just accepted agreements — an agreement
// requires the full submit → accept flow and would be far too sparse to
// chart while the marketplace is young. A proposed rate is still a real
// number a developer put on a real project in a real category, and there
// are many more of them.
export async function getHourlyRateTrendRows(monthsBack = 6): Promise<RateTrendRow[]> {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - (monthsBack - 1));
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${proposals.createdAt}), 'YYYY-MM')`,
      category: projects.category,
      avgRate: sql<string>`avg(${proposals.proposedAmount})`,
      count: sql<string>`count(*)`,
    })
    .from(proposals)
    .innerJoin(projects, eq(proposals.projectId, projects.id))
    .where(and(eq(proposals.proposedRateType, "hourly"), gte(proposals.createdAt, since)))
    .groupBy(sql`date_trunc('month', ${proposals.createdAt})`, projects.category)
    .orderBy(sql`date_trunc('month', ${proposals.createdAt})`);

  return rows
    .filter((r): r is typeof r & { category: string } => !!r.category)
    .map((r) => ({ month: r.month, category: r.category, avgRate: Number(r.avgRate), count: Number(r.count) }));
}
