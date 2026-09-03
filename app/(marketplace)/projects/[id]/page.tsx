import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  projectSkills,
  skills,
  projectAttachments,
  clientProfiles,
  companies,
  proposals,
  developerProfiles,
} from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { isFavorited } from "@/modules/favorites/actions";
import { FavoriteButton } from "@/modules/favorites/FavoriteButton";
import { StatusBadge } from "@/modules/ui/StatusBadge";
import { LinkButton } from "@/modules/ui/Button";
import { ReportForm } from "@/modules/admin/ReportForm";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();

  const [requiredSkills, attachments] = await Promise.all([
    db
      .select({ name: skills.name })
      .from(projectSkills)
      .innerJoin(skills, eq(projectSkills.skillId, skills.id))
      .where(eq(projectSkills.projectId, id)),
    db.select().from(projectAttachments).where(eq(projectAttachments.projectId, id)),
  ]);

  let clientName = "A client";
  let clientProfileHref: string | null = null;
  if (project.companyId) {
    const [company] = await db.select().from(companies).where(eq(companies.id, project.companyId));
    if (company) {
      clientName = company.name;
      clientProfileHref = `/companies/${company.id}`;
    }
  } else {
    const [clientProfile] = await db
      .select()
      .from(clientProfiles)
      .where(eq(clientProfiles.userId, project.clientUserId));
    if (clientProfile) {
      clientProfileHref = `/clients/${clientProfile.id}`;
      if (clientProfile.displayName) clientName = clientProfile.displayName;
    }
  }

  const { userId: authProviderId } = await auth();
  const currentUser = authProviderId ? await ensureCurrentUser() : null;
  const isOwner = currentUser?.id === project.clientUserId;

  let alreadyProposed = false;
  if (currentUser && !isOwner) {
    const [existing] = await db
      .select({ id: proposals.id })
      .from(proposals)
      .innerJoin(developerProfiles, eq(proposals.developerProfileId, developerProfiles.id))
      .where(and(eq(proposals.projectId, id), eq(developerProfiles.userId, currentUser.id)));
    alreadyProposed = existing !== undefined;
  }

  const favorited = currentUser && !isOwner ? await isFavorited(currentUser.id, "project", project.id) : false;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusBadge status={project.status} />
          {currentUser && !isOwner && (
            <FavoriteButton
              targetType="project"
              targetId={project.id}
              path={`/projects/${project.id}`}
              initialFavorited={favorited}
            />
          )}
        </div>
        {isOwner && project.status === "draft" && (
          <Link href={`/projects/${project.id}/edit`} className="text-sm font-medium text-brand-600 underline">
            Finish &amp; publish
          </Link>
        )}
        {isOwner && project.status !== "draft" && (
          <Link
            href={`/projects/${project.id}/proposals`}
            className="text-sm font-medium text-brand-600 underline"
          >
            View proposals
          </Link>
        )}
      </div>

      <h1 className="mb-2 text-h1">{project.title}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Posted by{" "}
        {clientProfileHref ? (
          <Link href={clientProfileHref} className="text-brand-600 underline">
            {clientName}
          </Link>
        ) : (
          clientName
        )}{" "}
        · {project.category}
      </p>

      <p className="mb-6 whitespace-pre-wrap text-neutral-700">{project.description}</p>

      <dl className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-neutral-500">Budget</dt>
          <dd className="font-medium">
            {project.budgetMin && project.budgetMax
              ? `$${project.budgetMin}–$${project.budgetMax}`
              : "Not specified"}
            {project.budgetType === "hourly" ? "/hr" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Type</dt>
          <dd className="font-medium capitalize">{project.budgetType}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Timeline</dt>
          <dd className="font-medium">
            {project.timelineDays ? `${project.timelineDays} days` : "Flexible"}
          </dd>
        </div>
      </dl>

      {requiredSkills.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-neutral-500">Required skills</h2>
          <ul className="flex flex-wrap gap-2">
            {requiredSkills.map((s) => (
              <li key={s.name} className="rounded-card border border-neutral-300 px-3 py-1 text-sm capitalize text-neutral-600">
                {s.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 text-sm font-medium text-neutral-500">Attachments</h2>
          <ul className="space-y-1">
            {attachments.map((a) => (
              <li key={a.id}>
                <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-600 underline">
                  {a.filename ?? "Download"}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isOwner && project.status === "published" && project.visibility === "public" && (
        <>
          {currentUser ? (
            alreadyProposed ? (
              <p className="rounded-md bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
                You&rsquo;ve already submitted a proposal for this project.
              </p>
            ) : (
              <LinkButton href={`/projects/${project.id}/proposals/new`}>Submit Proposal</LinkButton>
            )
          ) : (
            <LinkButton href="/sign-in">Sign in to submit a proposal</LinkButton>
          )}
        </>
      )}

      {currentUser && !isOwner && (
        <div className="mt-6">
          <ReportForm targetType="project" targetId={project.id} label="Report this project" />
        </div>
      )}
    </main>
  );
}
