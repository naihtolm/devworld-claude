"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";

async function requireCurrentDbUser() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) throw new Error("Could not resolve the signed-in user.");
  return user;
}

type FavoriteType = "developer_profile" | "project";

// DW-503 — a simple toggle rather than separate add/remove actions, since
// the one place this gets called from (FavoriteButton) always knows the
// current state and just wants "the opposite of that."
export async function toggleFavorite(targetType: FavoriteType, targetId: string, path: string) {
  const user = await requireCurrentDbUser();

  const [existing] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.targetType, targetType), eq(favorites.targetId, targetId)));

  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
  } else {
    await db.insert(favorites).values({ userId: user.id, targetType, targetId });
  }

  revalidatePath(path);
  revalidatePath("/saved");
}

export async function isFavorited(userId: string, targetType: FavoriteType, targetId: string) {
  const [existing] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.targetType, targetType), eq(favorites.targetId, targetId)));
  return !!existing;
}
