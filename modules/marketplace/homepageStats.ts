import { sql } from "drizzle-orm";
import { db } from "@/db";

export type HomepageStats = {
  activeProjects: number;
  developers: number;
  completed: number;
  totalReviews: number;
  averageRating: number | null;
};

// One round trip via scalar subqueries, not five separate sequential
// SELECTs — the homepage is the highest-traffic page and the pooled DB
// connection is a single socket (max: 1, see db/index.ts). Adding the
// trust-summary counts as their own extra sequential query pushed real
// production requests into "canceling statement due to statement
// timeout" under connection pressure; this collapses what would have
// been activeProjects + developers + completed + totalReviews +
// averageRating (4 queries before this) into 1.
export async function getHomepageStats(): Promise<HomepageStats> {
  const rows = (await db.execute(sql`
    select
      (select count(*) from projects where status = 'published') as "activeProjects",
      (select count(*) from developer_profiles) as "developers",
      (select count(*) from agreements where status = 'completed') as "completed",
      (select count(*) from reviews) as "totalReviews",
      (select avg(rating) from reviews) as "averageRating"
  `)) as unknown as {
    activeProjects: string;
    developers: string;
    completed: string;
    totalReviews: string;
    averageRating: string | null;
  }[];
  const row = rows[0];

  return {
    activeProjects: Number(row.activeProjects),
    developers: Number(row.developers),
    completed: Number(row.completed),
    totalReviews: Number(row.totalReviews),
    averageRating: row.averageRating !== null ? Number(row.averageRating) : null,
  };
}
