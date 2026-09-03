import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { developerProfiles, developerSkills, skills, portfolioItems, users, projects } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { getTrustSignal } from "@/modules/reviews/trust";
import { deletePortfolioItem } from "@/modules/profiles/actions";
import { AddPortfolioItemForm } from "@/modules/profiles/AddPortfolioItemForm";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";
import { Avatar } from "@/modules/profiles/Avatar";
import { sendInvitation } from "@/modules/proposals/actions";
import { isFavorited } from "@/modules/favorites/actions";
import { FavoriteButton } from "@/modules/favorites/FavoriteButton";
import { Button } from "@/modules/ui/Button";
import { ReportForm } from "@/modules/admin/ReportForm";

export default async function DeveloperProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [profile] = await db.select().from(developerProfiles).where(eq(developerProfiles.id, id));
  if (!profile) notFound();

  const [profileUser] = await db.select().from(users).where(eq(users.id, profile.userId));

  const { name: clerkName, imageUrl } = await getClerkDisplay(profileUser?.authProviderId);
  const name = clerkName ?? profileUser?.email ?? "Developer";

  const devSkills = await db
    .select({ name: skills.name })
    .from(developerSkills)
    .innerJoin(skills, eq(developerSkills.skillId, skills.id))
    .where(eq(developerSkills.developerProfileId, id));

  const items = await db.select().from(portfolioItems).where(eq(portfolioItems.developerProfileId, id));

  const trust = await getTrustSignal(profile.userId);

  const { userId: authProviderId } = await auth();
  const currentUser = authProviderId ? await ensureCurrentUser() : null;
  const isOwner = currentUser?.id === profile.userId;

  const myPublishedProjects =
    currentUser && !isOwner
      ? await db
          .select()
          .from(projects)
          .where(and(eq(projects.clientUserId, currentUser.id), eq(projects.status, "published")))
      : [];

  const favorited =
    currentUser && !isOwner ? await isFavorited(currentUser.id, "developer_profile", profile.id) : false;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={name} imageUrl={imageUrl} size="lg" />
          <div>
            <h1 className="text-2xl font-semibold">{name}</h1>
            {profile.headline && <p className="text-neutral-600">{profile.headline}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentUser && !isOwner && (
            <FavoriteButton
              targetType="developer_profile"
              targetId={profile.id}
              path={`/developers/${profile.id}`}
              initialFavorited={favorited}
            />
          )}
          {isOwner && (
            <Link href="/profile/developer" className="text-sm text-brand-600 underline">
              Edit profile
            </Link>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
        {profile.location && <span>{profile.location}</span>}
        <span className="capitalize">{profile.availability}</span>
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

      {myPublishedProjects.length > 0 && (
        <details className="mb-6 text-sm">
          <summary className="cursor-pointer text-brand-600 underline">Invite to a project</summary>
          <form action={sendInvitation} className="mt-3 space-y-3 rounded-md border border-dashed p-4">
            <input type="hidden" name="developerProfileId" value={profile.id} />
            <div>
              <label className="mb-1 block text-sm font-medium">Project</label>
              <select
                name="projectId"
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                {myPublishedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Message (optional)</label>
              <textarea
                name="message"
                rows={3}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Why you'd like them to take a look"
              />
            </div>
            <Button type="submit" size="sm">
              Send invitation
            </Button>
          </form>
        </details>
      )}

      {profile.bio && <p className="mb-6 whitespace-pre-wrap text-neutral-700">{profile.bio}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        {profile.yearsExperience !== null && (
          <div>
            <dt className="text-neutral-500">Experience</dt>
            <dd className="font-medium">{profile.yearsExperience} years</dd>
          </div>
        )}
        {profile.hourlyRate && (
          <div>
            <dt className="text-neutral-500">Hourly rate</dt>
            <dd className="font-medium">${profile.hourlyRate}/hr</dd>
          </div>
        )}
        {profile.projectStartingPrice && (
          <div>
            <dt className="text-neutral-500">Projects from</dt>
            <dd className="font-medium">${profile.projectStartingPrice}</dd>
          </div>
        )}
      </div>

      {devSkills.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-neutral-500">Skills</h2>
          <ul className="flex flex-wrap gap-2">
            {devSkills.map((s) => (
              <li key={s.name} className="rounded-full bg-brand-50 px-3 py-1 text-sm capitalize text-brand-700">
                {s.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        {profile.githubUsername && (
          <a
            href={`https://github.com/${profile.githubUsername}`}
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 underline"
          >
            GitHub
          </a>
        )}
        {profile.gitlabUsername && (
          <a
            href={`https://gitlab.com/${profile.gitlabUsername}`}
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 underline"
          >
            GitLab
          </a>
        )}
        {profile.linkedinUrl && (
          <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline">
            LinkedIn
          </a>
        )}
        {profile.websiteUrl && (
          <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline">
            Website
          </a>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Portfolio</h2>
        {items.length === 0 ? (
          <p className="mb-4 text-sm text-neutral-400">No portfolio items yet.</p>
        ) : (
          <ul className="mb-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-medium">{item.title}</p>
                  {isOwner && (
                    <form action={deletePortfolioItem.bind(null, item.id)}>
                      <button type="submit" className="text-xs text-neutral-400 underline">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
                {item.role && <p className="text-sm text-neutral-500">{item.role}</p>}
                {item.description && <p className="mt-1 text-sm text-neutral-600">{item.description}</p>}
                {item.technologies && item.technologies.length > 0 && (
                  <p className="mt-2 text-xs text-neutral-400">{item.technologies.join(" · ")}</p>
                )}
                <div className="mt-2 flex gap-3 text-sm">
                  {item.repoUrl && (
                    <a href={item.repoUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                      Repo
                    </a>
                  )}
                  {item.externalUrl && (
                    <a href={item.externalUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                      Live
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {isOwner && <AddPortfolioItemForm />}
      </div>

      {currentUser && !isOwner && (
        <div className="mt-6">
          <ReportForm targetType="user" targetId={profile.userId} label="Report this user" />
        </div>
      )}
    </main>
  );
}
