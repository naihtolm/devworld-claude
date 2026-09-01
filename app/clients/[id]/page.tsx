import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { clientProfiles, users, projects } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { getTrustSignal } from "@/modules/reviews/trust";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";
import { Avatar } from "@/modules/profiles/Avatar";
import { ReportForm } from "@/modules/admin/ReportForm";

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [profile] = await db.select().from(clientProfiles).where(eq(clientProfiles.id, id));
  if (!profile) notFound();

  const [profileUser] = await db.select().from(users).where(eq(users.id, profile.userId));
  const { imageUrl } = await getClerkDisplay(profileUser?.authProviderId);
  const name = profile.displayName || profileUser?.email || "Client";

  const trust = await getTrustSignal(profile.userId);

  const publishedProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.clientUserId, profile.userId))
    .orderBy(desc(projects.createdAt))
    .limit(10);

  const { userId: authProviderId } = await auth();
  const currentUser = authProviderId ? await ensureCurrentUser() : null;
  const isOwner = currentUser?.id === profile.userId;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={name} imageUrl={imageUrl} size="lg" />
          <h1 className="text-2xl font-semibold">{name}</h1>
        </div>
        {isOwner && (
          <Link href="/profile/client" className="text-sm text-brand-600 underline">
            Edit profile
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
        {profile.location && <span>{profile.location}</span>}
        {trust.badge === "new" ? (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            New to Devworld
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            {"★"} {trust.average.toFixed(1)} ({trust.reviewCount}) · {trust.completedCount} completed
          </span>
        )}
      </div>

      {profile.bio && <p className="mb-8 whitespace-pre-wrap text-neutral-700">{profile.bio}</p>}

      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Posted projects</h2>
        {publishedProjects.filter((p) => p.status === "published").length === 0 ? (
          <p className="text-sm text-neutral-400">No public projects yet.</p>
        ) : (
          <ul className="space-y-2">
            {publishedProjects
              .filter((p) => p.status === "published")
              .map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="text-sm text-brand-600 underline">
                    {p.title}
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </div>

      {currentUser && !isOwner && (
        <div className="mt-6">
          <ReportForm targetType="user" targetId={profile.userId} label="Report this user" />
        </div>
      )}
    </main>
  );
}
