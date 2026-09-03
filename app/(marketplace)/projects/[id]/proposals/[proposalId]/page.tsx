import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, proposals, developerProfiles, users, agreements } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { shortlistProposal, declineProposal, acceptProposal } from "@/modules/proposals/actions";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";
import { Avatar } from "@/modules/profiles/Avatar";
import { StatusBadge } from "@/modules/ui/StatusBadge";
import { Button, LinkButton } from "@/modules/ui/Button";
import { getOrCreateProjectConversation } from "@/modules/messaging/actions";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string; proposalId: string }>;
}) {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const { id, proposalId } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();

  const currentUser = await ensureCurrentUser();
  if (currentUser?.id !== project.clientUserId) {
    redirect(`/projects/${id}`);
  }

  const [row] = await db
    .select({ proposal: proposals, developer: developerProfiles, developerUser: users })
    .from(proposals)
    .innerJoin(developerProfiles, eq(proposals.developerProfileId, developerProfiles.id))
    .innerJoin(users, eq(developerProfiles.userId, users.id))
    .where(eq(proposals.id, proposalId));
  if (!row) notFound();

  const { proposal, developer, developerUser } = row;

  let agreementId: string | null = null;
  if (proposal.status === "accepted") {
    const [agreement] = await db
      .select({ id: agreements.id })
      .from(agreements)
      .where(eq(agreements.proposalId, proposal.id));
    agreementId = agreement?.id ?? null;
  }

  const { name: clerkName, imageUrl } = await getClerkDisplay(developerUser.authProviderId);
  const name = clerkName ?? developerUser.email;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/projects/${id}/proposals`}
        className="mb-6 inline-block text-sm text-neutral-500 underline"
      >
        ← Back to proposals
      </Link>

      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={name} imageUrl={imageUrl} size="lg" />
          <h1 className="text-h1">
            <Link href={`/developers/${developer.id}`} className="hover:underline">
              {name}
            </Link>
          </h1>
        </div>
        <form action={getOrCreateProjectConversation.bind(null, id, developer.id)}>
          <Button type="submit" variant="ghost" size="sm" className="p-0">
            Message {name}
          </Button>
        </form>
      </div>
      <div className="mb-6">
        <StatusBadge status={proposal.status} />
      </div>

      {developer.headline && <p className="mb-4 text-neutral-700">{developer.headline}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-neutral-500">Proposed</dt>
          <dd className="font-medium">
            ${proposal.proposedAmount}
            {proposal.proposedRateType === "hourly" ? "/hr" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Timeline</dt>
          <dd className="font-medium">
            {proposal.estimatedTimelineDays ? `${proposal.estimatedTimelineDays} days` : "Not specified"}
          </dd>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Introduction</h2>
        <p className="whitespace-pre-wrap text-neutral-700">{proposal.introduction}</p>
      </div>

      {(proposal.status === "submitted" || proposal.status === "shortlisted") && (
        <div className="flex gap-3">
          <form action={acceptProposal.bind(null, proposal.id)}>
            <Button type="submit">Accept</Button>
          </form>
          {proposal.status === "submitted" && (
            <form action={shortlistProposal.bind(null, proposal.id)}>
              <Button type="submit" variant="secondary">
                Shortlist
              </Button>
            </form>
          )}
          <form action={declineProposal.bind(null, proposal.id)}>
            <Button type="submit" variant="danger">
              Decline
            </Button>
          </form>
        </div>
      )}

      {proposal.status === "accepted" && agreementId && (
        <LinkButton href={`/agreements/${agreementId}`}>View agreement</LinkButton>
      )}
    </main>
  );
}
