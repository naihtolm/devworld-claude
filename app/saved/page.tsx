import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { favorites, developerProfiles, users, projects } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";
import { Avatar } from "@/modules/profiles/Avatar";
import { Card } from "@/modules/ui/Card";
import { StatusBadge } from "@/modules/ui/StatusBadge";

// DW-503
export default async function SavedPage() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) redirect("/sign-in");

  const savedDeveloperIds = await db
    .select({ targetId: favorites.targetId })
    .from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.targetType, "developer_profile")));

  const savedProjectIds = await db
    .select({ targetId: favorites.targetId })
    .from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.targetType, "project")));

  const developerRows = savedDeveloperIds.length
    ? await db
        .select({ profile: developerProfiles, user: users })
        .from(developerProfiles)
        .innerJoin(users, eq(developerProfiles.userId, users.id))
        .where(inArray(developerProfiles.id, savedDeveloperIds.map((f) => f.targetId)))
    : [];

  const developers = await Promise.all(
    developerRows.map(async ({ profile, user: devUser }) => {
      const { name, imageUrl } = await getClerkDisplay(devUser.authProviderId);
      return { profile, name: name ?? devUser.email, imageUrl };
    })
  );

  const savedProjects = savedProjectIds.length
    ? await db.select().from(projects).where(inArray(projects.id, savedProjectIds.map((f) => f.targetId)))
    : [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-h1">Saved</h1>

      <h2 className="mb-3 text-h2">Developers</h2>
      {developers.length === 0 ? (
        <p className="mb-8 text-sm text-neutral-500">No saved developers yet.</p>
      ) : (
        <ul className="mb-8 space-y-3">
          {developers.map(({ profile, name, imageUrl }) => (
            <li key={profile.id}>
              <Link href={`/developers/${profile.id}`}>
                <Card className="flex items-center gap-3 hover:border-brand-600 hover:shadow-popover">
                  <Avatar name={name} imageUrl={imageUrl} size="sm" />
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    {profile.headline && <p className="text-xs text-neutral-500">{profile.headline}</p>}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 text-h2">Projects</h2>
      {savedProjects.length === 0 ? (
        <p className="text-sm text-neutral-500">No saved projects yet.</p>
      ) : (
        <ul className="space-y-3">
          {savedProjects.map((project) => (
            <li key={project.id}>
              <Link href={`/projects/${project.id}`}>
                <Card className="flex items-center justify-between hover:border-brand-600 hover:shadow-popover">
                  <p className="text-sm font-medium">{project.title}</p>
                  <StatusBadge status={project.status} />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
