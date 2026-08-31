import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, desc, count } from "drizzle-orm";
import { db } from "@/db";
import { projects, proposals } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { StatusBadge } from "@/modules/ui/StatusBadge";
import { LinkButton } from "@/modules/ui/Button";

// Marketplace README: "Client's 'My Projects' dashboard — posted projects
// with status, proposal count, quick actions."
export default async function DashboardPage() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) redirect("/sign-in");

  const rows = await db
    .select({ project: projects, proposalCount: count(proposals.id) })
    .from(projects)
    .leftJoin(proposals, eq(proposals.projectId, projects.id))
    .where(eq(projects.clientUserId, user.id))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  const totalProjects = rows.length;
  const activeProjects = rows.filter((r) => r.project.status === "published").length;
  const completedProjects = rows.filter((r) => r.project.status === "completed").length;
  const totalProposals = rows.reduce((sum, r) => sum + r.proposalCount, 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Projects</h1>
        <LinkButton href="/projects/new" size="sm">
          Post a project
        </LinkButton>
      </div>

      {rows.length > 0 && (
        <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total projects", value: totalProjects },
            { label: "Published", value: activeProjects },
            { label: "Proposals received", value: totalProposals },
            { label: "Completed", value: completedProjects },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
              <dt className="text-xs text-neutral-500">{stat.label}</dt>
              <dd className="text-2xl font-semibold text-brand-600">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {rows.length === 0 ? (
        <p className="text-neutral-500">
          You haven&rsquo;t posted any projects yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ project, proposalCount }) => (
            <li
              key={project.id}
              className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <Link href={`/projects/${project.id}`} className="font-medium hover:text-brand-600">
                  {project.title}
                </Link>
                <StatusBadge status={project.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-neutral-500">
                <span>{proposalCount} proposal{proposalCount === 1 ? "" : "s"}</span>
                <Link href={`/projects/${project.id}/proposals`} className="text-brand-600 underline">
                  View proposals
                </Link>
                <Link href={`/projects/${project.id}`} className="underline">
                  View project
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
