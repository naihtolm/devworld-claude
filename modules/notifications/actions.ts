"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, desc, count } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";

async function requireCurrentDbUser() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) throw new Error("Could not resolve the signed-in user.");
  return user;
}

export async function getUnreadCount(userId: string) {
  const [row] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.count ?? 0;
}

export async function getRecentNotifications(userId: string, limit = 10) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markAsRead(notificationId: string) {
  const user = await requireCurrentDbUser();

  const [notification] = await db.select().from(notifications).where(eq(notifications.id, notificationId));
  if (!notification || notification.userId !== user.id) throw new Error("Not found.");

  await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, notificationId));
  revalidatePath("/", "layout");
}

export async function markAllAsRead() {
  const user = await requireCurrentDbUser();

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  revalidatePath("/", "layout");
}
