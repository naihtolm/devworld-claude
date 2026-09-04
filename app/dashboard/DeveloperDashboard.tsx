import Link from "next/link";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { agreements, proposals, projects, payments } from "@/db/schema";
import { getRecommendedProjects } from "@/modules/marketplace/recommendations";
import { getProposalAnalytics, PROPOSAL_STATUS_ORDER } from "@/modules/marketplace/proposalAnalytics";
import { StatusBadge } from "@/modules/ui/StatusBadge";
import { classify, STATUS_HEX } from "@/modules/ui/statusClassify";
import { LinkButton } from "@/modules/ui/Button";
import { Card, LinkCard } from "@/modules/ui/Card";

export async function DeveloperDashboard({
  userId,
  developerProfileId,
}: {
  userId: string;
  developerProfileId: string;
}) {
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

  const analytics = await getProposalAnalytics(developerProfileId);
  const recommended = await getRecommendedProjects(userId, developerProfileId);

  const recommendedSection = recommended.length > 0 && (
    <div className="mt-8">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500">
        {"// projects_like_ones_you_viewed"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {recommended.map((project) => (
          <LinkCard key={project.id} href={`/projects/${project.id}`}>
            <p className="font-medium text-neutral-900">{project.title}</p>
            <p className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
              <span className="rounded-card border border-neutral-300 px-2 py-0.5 font-mono font-medium text-neutral-600">
                {project.category}
              </span>
              <span className="font-mono capitalize">{project.budgetType}</span>
            </p>
          </LinkCard>
        ))}
      </div>
    </div>
  );

  if (proposalRows.length === 0 && agreementRows.length === 0) {
    return (
      <div>
        <div className="rounded-card border border-neutral-200 bg-white px-8 py-12 text-center shadow-card">
          <h1 className="mb-2 text-h1">Find your first project</h1>
          <p className="mx-auto mb-6 max-w-md text-neutral-600">
            Browse published projects and submit a proposal — your profile and portfolio go with it.
          </p>
          <LinkButton href="/projects">browse_projects</LinkButton>
        </div>
        {recommendedSection}
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

      {analytics.total > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500">
            {"// proposal_analytics"}
          </h2>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Card>
              <dt className="font-mono text-xs text-neutral-500">win_rate</dt>
              <dd className="font-mono text-2xl font-semibold text-brand-600 tabular-nums">
                {analytics.winRate === null ? "—" : `${Math.round(analytics.winRate * 100)}%`}
              </dd>
              {analytics.winRate === null && (
                <p className="mt-1 text-xs text-neutral-500">No decided proposals yet</p>
              )}
            </Card>
            <Card>
              <dt className="font-mono text-xs text-neutral-500">total_proposals</dt>
              <dd className="font-mono text-2xl font-semibold text-brand-600 tabular-nums">{analytics.total}</dd>
            </Card>
          </div>
          <Card>
            <div className="space-y-2">
              {analytics.breakdown
                .filter((s) => s.count > 0)
                .sort((a, b) => PROPOSAL_STATUS_ORDER.indexOf(a.status) - PROPOSAL_STATUS_ORDER.indexOf(b.status))
                .map(({ status, count }) => (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 font-mono text-xs capitalize text-neutral-500">
                      {status.replace(/_/g, " ")}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-card bg-neutral-200">
                      <div
                        className="h-full rounded-card"
                        style={{
                          width: `${(count / analytics.total) * 100}%`,
                          backgroundColor: STATUS_HEX[classify(status)],
                        }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-neutral-500">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

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

      {recommendedSection}
    </div>
  );
}
