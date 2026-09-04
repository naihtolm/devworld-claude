import { db } from "@/db";
import { projectViews } from "@/db/schema";

// Called from the project detail page render. Upserts so a repeat visit
// bumps recency (createdAt) instead of piling up duplicate rows for the
// same user/project pair — see the schema comment on projectViews.
export async function recordProjectView(userId: string, projectId: string) {
  await db
    .insert(projectViews)
    .values({ userId, projectId })
    .onConflictDoUpdate({
      target: [projectViews.userId, projectViews.projectId],
      set: { createdAt: new Date() },
    });
}
