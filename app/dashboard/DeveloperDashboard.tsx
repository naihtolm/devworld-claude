import Link from "next/link";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { agreements, proposals, projects, payments } from "@/db/schema";
import { StatusBadge } from "@/modules/ui/StatusBadge";
import { LinkButton } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";

export async function DeveloperDashboard({ developerProfileId }: { developerProfileId: string }) {
  const proposalRows = await db
    .select({ proposal: proposals, project: projects })
    .from(proposals)
    .innerJoin(projects, eq(proposals.projectId, projects.id))
    .where(eq(proposals.developerProfileId, developerProfileId))
    .orderBy(desc(proposals.createdAt))
    .limit(10);

  const agreementRows = await db
    .select()
    .from(agreements)
    .where(eq(agreements.developerProfileId, developerProfileId));

  const activeAgreements = agreementRows.filter((a) => a.status === "active").length;
  const completedAgreements = agreementRows.filter((a) => a.status === "completed").length;

  const agreementIds = agreementRows.map((a) => a.id);
  const [{ earned } = { earned: "0" }] = agreementIds.length
    ? await db
        .select({ earned: sql<string>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .where(
          and(
            inArray(payments.agreementId, agreementIds),
            inArray(payments.type, ["milestone_payout", "hourly_invoice"]),
            eq(payments.status, "succeeded")
          )
        )
    : [];

  if (proposalRows.length === 0 && agreementRows.length === 0) {
    return (
      <div className="rounded-card border border-neutral-200 bg-white px-8 py-12 text-center shadow-card">
        <h1 className="mb-2 text-h1">Find your first project</h1>
        <p className="mx-auto mb-6 max-w-md text-neutral-600">
          Browse published projects and submit a proposal — your profile and portfolio go with it.
        </p>
        <LinkButton href="/projects">browse_projects</LinkButton>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-mono text-h1">
          <span className="text-brand-600">$</span> my_work
        </h1>
        <LinkButton href="/projects" size="sm">
          browse_projects
        </LinkButton>
      </div>

      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "active", value: activeAgreements },
          { label: "proposals_sent", value: proposalRows.length },
          { label: "earned", value: `$${Number(earned).toLocaleString()}` },
          { label: "completed", value: completedAgreements },
        ].map((stat) => (
          <Card key={stat.label}>
            <dt className="font-mono text-xs text-neutral-500">{stat.label}</dt>
            <dd className="font-mono text-2xl font-semibold text-brand-600 tabular-nums">{stat.value}</dd>
          </Card>
        ))}
      </dl>

      <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500">
        {"// recent_proposals"}
      </h2>
      <ul className="space-y-3">
        {proposalRows.map(({ proposal, project }) => (
          <li key={proposal.id}>
            <Card>
              <div className="flex items-center justify-between">
                {/* No developer-facing proposal-detail route exists yet
                    (the one at /projects/[id]/proposals/[proposalId] is
                    client-only — it redirects anyone else away) — link to
                    the project itself until that's built. */}
                <Link href={`/projects/${project.id}`} className="font-medium hover:text-brand-600">
                  {project.title}
                </Link>
                <StatusBadge status={proposal.status} />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
