import Link from "next/link";
import { eq, desc, count } from "drizzle-orm";
import { db } from "@/db";
import { projects, proposals } from "@/db/schema";
import { StatusBadge } from "@/modules/ui/StatusBadge";
import { LinkButton } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";

const HOW_IT_WORKS = [
  { title: "Post a project", body: "Describe the work, set a budget, publish it." },
  { title: "Review proposals", body: "Developers apply — compare rates, portfolios, fit." },
  { title: "Fund milestones", body: "Pay as work is delivered, held safely until you approve it." },
];

export async function ClientDashboard({ userId }: { userId: string }) {
  const rows = await db
    .select({ project: projects, proposalCount: count(proposals.id) })
    .from(projects)
    .leftJoin(proposals, eq(proposals.projectId, projects.id))
    .where(eq(projects.clientUserId, userId))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  const totalProjects = rows.length;
  const activeProjects = rows.filter((r) => r.project.status === "published").length;
  const completedProjects = rows.filter((r) => r.project.status === "completed").length;
  const totalProposals = rows.reduce((sum, r) => sum + r.proposalCount, 0);

  if (rows.length === 0) {
    return (
      <div>
        <div className="mb-10 rounded-card border border-neutral-200 bg-white px-8 py-12 text-center shadow-card">
          <h1 className="mb-2 text-h1">Post your first project</h1>
          <p className="mx-auto mb-6 max-w-md text-neutral-600">
            Describe what you need built — developers who match your skills and budget will send proposals.
          </p>
          <LinkButton href="/projects/new">+ post_a_project</LinkButton>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <Card key={step.title}>
              <p className="mb-1 font-mono text-xs text-brand-600">{String(i + 1).padStart(2, "0")}</p>
              <p className="mb-1 text-sm font-medium">{step.title}</p>
              <p className="text-sm text-neutral-500">{step.body}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-mono text-h1">
          <span className="text-brand-600">$</span> my_projects
        </h1>
        <LinkButton href="/projects/new" size="sm">
          + post_project
        </LinkButton>
      </div>

      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "total", value: totalProjects },
          { label: "published", value: activeProjects },
          { label: "proposals", value: totalProposals },
          { label: "completed", value: completedProjects },
        ].map((stat) => (
          <Card key={stat.label}>
            <dt className="font-mono text-xs text-neutral-500">{stat.label}</dt>
            <dd className="font-mono text-2xl font-semibold text-brand-600 tabular-nums">{stat.value}</dd>
          </Card>
        ))}
      </dl>

      <ul className="space-y-3">
        {rows.map(({ project, proposalCount }) => (
          <li key={project.id}>
            <Card className="hover:border-brand-600 hover:shadow-popover">
              <div className="mb-2 flex items-center justify-between">
                <Link href={`/projects/${project.id}`} className="font-medium hover:text-brand-600">
                  {project.title}
                </Link>
                <StatusBadge status={project.status} />
              </div>
              <div className="flex items-center gap-4 font-mono text-sm text-neutral-500">
                {project.status === "draft" ? (
                  <Link href={`/projects/${project.id}/edit`} className="text-brand-600 underline">
                    finish_and_publish →
                  </Link>
                ) : (
                  <>
                    <span>
                      {proposalCount} proposal{proposalCount === 1 ? "" : "s"}
                    </span>
                    <Link href={`/projects/${project.id}/proposals`} className="text-brand-600 underline">
                      view_proposals →
                    </Link>
                  </>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
