import { eq } from "drizzle-orm";
import { db } from "@/db";
import { developerProfiles, clientProfiles, users } from "@/db/schema";

// There's no `role` column on `users` — onboarding explicitly supports
// holding both a developer and a client profile at once ("you can always
// add the other later"), so role is derived from which profile rows exist
// rather than a single enum. Shared by the dashboard split (G-4) and the
// nav role-awareness fix (G-6) so both branch on the same source of truth.
export async function getUserRoles(userId: string) {
  const [developerProfile] = await db
    .select({ id: developerProfiles.id })
    .from(developerProfiles)
    .where(eq(developerProfiles.userId, userId));
  const [clientProfile] = await db
    .select({ id: clientProfiles.id })
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, userId));
  const [dbUser] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));

  return {
    isDeveloper: !!developerProfile,
    isClient: !!clientProfile,
    isAdmin: dbUser?.isAdmin ?? false,
    developerProfileId: developerProfile?.id ?? null,
    clientProfileId: clientProfile?.id ?? null,
  };
}
