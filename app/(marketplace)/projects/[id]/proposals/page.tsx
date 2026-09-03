import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, proposals, developerProfiles, users } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { shortlistProposal, declineProposal } from "@/modules/proposals/actions";
import { getTrustSignal } from "@/modules/reviews/trust";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";
import { Avatar } from "@/modules/profiles/Avatar";
import { StatusBadge } from "@/modules/ui/StatusBadge";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";

export default async function ProjectProposalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const { id } = await params;
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();

  const currentUser = await ensureCurrentUser();
  if (currentUser?.id !== project.clientUserId) {
    redirect(`/projects/${id}`);
  }

  const rows = await db
    .select({ proposal: proposals, developer: developerProfiles, developerUser: users })
    .from(proposals)
    .innerJoin(developerProfiles, eq(proposals.developerProfileId, developerProfiles.id))
    .innerJoin(users, eq(developerProfiles.userId, users.id))
    .where(eq(proposals.projectId, id));

  const proposalsWithNames = await Promise.all(
    rows.map(async (row) => {
      const { name: clerkName, imageUrl } = await getClerkDisplay(row.developerUser.authProviderId);
      const name = clerkName ?? row.developerUser.email;
      const trust = await getTrustSignal(row.developerUser.id);
      const badge = trust.badge === "new" ? "New to Devworld" : `★ ${trust.average.toFixed(1)}`;
      return { ...row, name, imageUrl, badge };
    })
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href={`/projects/${id}`} className="mb-6 inline-block text-sm text-neutral-500 underline">
        ← Back to project
      </Link>
      <h1 className="mb-6 text-h1">Proposals for &ldquo;{project.title}&rdquo;</h1>

      {proposalsWithNames.length === 0 ? (
        <p className="text-neutral-500">No proposals yet.</p>
      ) : (
        <ul className="space-y-4">
          {proposalsWithNames.map(({ proposal, developer, name, imageUrl, badge }) => (
            <li key={proposal.id}>
              <Card className="hover:shadow-popover">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Avatar name={name} imageUrl={imageUrl} size="sm" />
                    <Link href={`/developers/${developer.id}`} className="font-medium hover:text-brand-600">
                      {name}
                    </Link>
                    <span className="text-xs text-neutral-400">{badge}</span>
                  </span>
                  <StatusBadge status={proposal.status} />
                </div>
                <p className="mb-2 text-sm text-neutral-600">
                  ${proposal.proposedAmount}
                  {proposal.proposedRateType === "hourly" ? "/hr" : ""} ·{" "}
                  {proposal.estimatedTimelineDays
                    ? `${proposal.estimatedTimelineDays} days`
                    : "No timeline given"}
                </p>
                <p className="mb-3 line-clamp-2 text-sm text-neutral-500">{proposal.introduction}</p>
                <div className="flex items-center gap-3 text-sm">
                  <Link href={`/projects/${id}/proposals/${proposal.id}`} className="text-brand-600 underline">
                    View full
                  </Link>
                  {proposal.status === "submitted" && (
                    <>
                      <form action={shortlistProposal.bind(null, proposal.id)}>
                        <Button type="submit" variant="ghost" size="sm" className="p-0 text-neutral-700">
                          Shortlist
                        </Button>
                      </form>
                      <form action={declineProposal.bind(null, proposal.id)}>
                        <Button type="submit" variant="ghost" size="sm" className="p-0 text-neutral-400">
                          Decline
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
