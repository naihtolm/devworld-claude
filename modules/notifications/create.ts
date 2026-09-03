import { db } from "@/db";
import { notifications } from "@/db/schema";

// Plain internal helper, not a "use server" action — only ever called
// server-to-server from inside other actions that already know a
// notification-worthy thing just happened, never bound to a form directly.
export async function createNotification({
  userId,
  type,
  title,
  body,
  href,
}: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
}) {
  await db.insert(notifications).values({ userId, type, title, body, href });
}
