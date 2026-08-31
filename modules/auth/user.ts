import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function getUserByAuthProviderId(authProviderId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.authProviderId, authProviderId));
  return user ?? null;
}

export async function upsertUserFromClerk(authProviderId: string, email: string) {
  const existing = await getUserByAuthProviderId(authProviderId);
  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({ authProviderId, email })
    .returning();
  return created;
}

export async function deleteUserByAuthProviderId(authProviderId: string) {
  await db.delete(users).where(eq(users.authProviderId, authProviderId));
}

// Webhook is the source of truth in production, but it needs a public URL
// to reach this app — unreachable from plain `localhost` in dev. This lazily
// creates the row on first authenticated request so local dev doesn't need
// a tunnel just to get past onboarding.
export async function ensureCurrentUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return upsertUserFromClerk(clerkUser.id, email);
}
