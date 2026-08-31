"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agreements, developerProfiles, reviews } from "@/db/schema";
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

const reviewSchema = z.object({
  agreementId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

// One row per (agreement, reviewer) — both directions share this table,
// revieweeUserId is just whichever party the reviewer isn't. See
// modules/reviews/README.md.
export async function submitReview(formData: FormData) {
  const parsed = reviewSchema.safeParse({
    agreementId: formData.get("agreementId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const values = parsed.data;

  const user = await requireCurrentDbUser();

  const [agreement] = await db.select().from(agreements).where(eq(agreements.id, values.agreementId));
  if (!agreement) throw new Error("Not found.");
  if (agreement.status !== "completed") {
    throw new Error("Reviews can only be left once the agreement is completed.");
  }

  const [developer] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.id, agreement.developerProfileId));

  const isClient = agreement.clientUserId === user.id;
  const isDeveloper = developer?.userId === user.id;
  if (!isClient && !isDeveloper) throw new Error("Not found.");

  const revieweeUserId = isClient ? developer!.userId : agreement.clientUserId;

  try {
    await db.insert(reviews).values({
      agreementId: agreement.id,
      reviewerUserId: user.id,
      revieweeUserId,
      rating: values.rating,
      comment: values.comment,
    });
  } catch {
    // Unique index on (agreementId, reviewerUserId) — see db/schema.ts
    throw new Error("You've already reviewed this agreement.");
  }

  revalidatePath(`/agreements/${agreement.id}`);
}
