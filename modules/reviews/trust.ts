import { eq, or, and } from "drizzle-orm";
import { db } from "@/db";
import { reviews, agreements, developerProfiles } from "@/db/schema";

export type TrustSignal =
  | { badge: "new" }
  | { badge: "rated"; average: number; reviewCount: number; completedCount: number };

// A brand-new profile shows "New to Devworld" instead of a 0.0 rating —
// see modules/profiles/README.md's "New-account display rule". Derived
// purely from reviews/agreements, no schema flag involved.
export async function getTrustSignal(userId: string): Promise<TrustSignal> {
  const userReviews = await db.select().from(reviews).where(eq(reviews.revieweeUserId, userId));
  if (userReviews.length === 0) {
    return { badge: "new" };
  }

  const average = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;

  const [developerProfile] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.userId, userId));

  const completed = await db
    .select({ id: agreements.id })
    .from(agreements)
    .where(
      and(
        eq(agreements.status, "completed"),
        developerProfile
          ? or(eq(agreements.clientUserId, userId), eq(agreements.developerProfileId, developerProfile.id))
          : eq(agreements.clientUserId, userId)
      )
    );
  const completedCount = completed.length;

  return { badge: "rated", average, reviewCount: userReviews.length, completedCount };
}
