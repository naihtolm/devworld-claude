import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { proposals, developerProfiles, projects, agreements } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";

// A minimal list so a developer can find what they've submitted and reach
// the resulting agreement once accepted — the full dashboard (marketplace
// module's "My Projects" equivalent for developers) isn't built yet.
export default async function MyProposalsPage() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) redirect("/sign-in");

  const [developerProfile] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.userId, user.id));

  const rows = developerProfile
    ? await db
        .select({ proposal: proposals, project: projects })
        .from(proposals)
        .innerJoin(projects, eq(proposals.projectId, projects.id))
        .where(eq(proposals.developerProfileId, developerProfile.id))
        .orderBy(desc(proposals.createdAt))
    : [];

  const agreementIds = new Map<string, string>();
  if (rows.some((r) => r.proposal.status === "accepted")) {
    const rows2 = await db
      .select({ proposalId: agreements.proposalId, id: agreements.id })
      .from(agreements);
    for (const a of rows2) {
      if (a.proposalId) agreementIds.set(a.proposalId, a.id);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-h1">My Proposals</h1>

      {rows.length === 0 ? (
        <p className="text-neutral-500">
          No proposals yet — browse <Link href="/projects" className="underline">projects</Link> to submit one.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ proposal, project }) => (
            <li key={proposal.id} className="rounded-lg border p-4">
              <div className="mb-1 flex items-center justify-between">
                <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                  {project.title}
                </Link>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs capitalize text-neutral-600">
                  {proposal.status}
                </span>
              </div>
              <p className="text-sm text-neutral-500">
                ${proposal.proposedAmount}
                {proposal.proposedRateType === "hourly" ? "/hr" : ""}
              </p>
              {proposal.status === "accepted" && agreementIds.has(proposal.id) && (
                <Link
                  href={`/agreements/${agreementIds.get(proposal.id)}`}
                  className="mt-2 inline-block text-sm underline"
                >
                  View agreement →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
