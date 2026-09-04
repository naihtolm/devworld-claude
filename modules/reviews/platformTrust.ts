import { eq, and, gte, desc, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { reviews, developerProfiles, clientProfiles, users } from "@/db/schema";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";

export { shouldShowTrustSection, trustSectionSubcopy } from "@/modules/reviews/trustCopy";

export type PlatformTrustSummary = {
  totalReviews: number;
  averageRating: number | null;
};

// Site-wide, not per-profile — modules/reviews/trust.ts's getTrustSignal is
// the per-user version already shown on developer/client pages.
export async function getPlatformTrustSummary(): Promise<PlatformTrustSummary> {
  const [{ totalReviews, averageRating }] = await db
    .select({
      totalReviews: sql<string>`count(*)`,
      averageRating: sql<string | null>`avg(${reviews.rating})`,
    })
    .from(reviews);

  return {
    totalReviews: Number(totalReviews),
    averageRating: averageRating !== null ? Number(averageRating) : null,
  };
}

export type FeaturedReview = {
  id: string;
  rating: number;
  comment: string;
  name: string;
  href: string;
};

// Only call this when getPlatformTrustSummary().totalReviews > 0 — no
// point running the extra lookups against an empty table.
export async function getFeaturedReviews(limit = 3): Promise<FeaturedReview[]> {
  const rows = await db
    .select()
    .from(reviews)
    .where(and(gte(reviews.rating, 4), isNotNull(reviews.comment), ne(reviews.comment, "")))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);

  const featured: FeaturedReview[] = [];
  for (const r of rows) {
    if (!r.comment) continue;

    // The reviewee is either a developer or a client — resolve whichever
    // public profile actually exists so the quote can link somewhere real.
    const [developerProfile] = await db
      .select()
      .from(developerProfiles)
      .where(eq(developerProfiles.userId, r.revieweeUserId));

    if (developerProfile) {
      const [user] = await db.select().from(users).where(eq(users.id, r.revieweeUserId));
      const { name } = await getClerkDisplay(user?.authProviderId);
      featured.push({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        name: name ?? user?.email ?? "A developer",
        href: `/developers/${developerProfile.id}`,
      });
      continue;
    }

    const [clientProfile] = await db
      .select()
      .from(clientProfiles)
      .where(eq(clientProfiles.userId, r.revieweeUserId));

    if (clientProfile) {
      featured.push({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        name: clientProfile.displayName ?? "A client",
        href: `/clients/${clientProfile.id}`,
      });
    }
  }
  return featured;
}
