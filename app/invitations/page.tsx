import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { invitations, developerProfiles, projects, users, clientProfiles } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { acceptInvitation, declineInvitation } from "@/modules/proposals/actions";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";
import { StatusBadge } from "@/modules/ui/StatusBadge";
import { Button } from "@/modules/ui/Button";

// Developer's invitations inbox — modules/proposals/README.md's screen spec:
// project title, budget, client, message, accept (-> proposal) or decline.
export default async function InvitationsPage() {
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
        .select({ invitation: invitations, project: projects })
        .from(invitations)
        .innerJoin(projects, eq(invitations.projectId, projects.id))
        .where(eq(invitations.developerProfileId, developerProfile.id))
        .orderBy(desc(invitations.createdAt))
    : [];

  const rowsWithClient = await Promise.all(
    rows.map(async (row) => {
      const [clientUser] = await db.select().from(users).where(eq(users.id, row.project.clientUserId));
      const [clientProfile] = await db
        .select()
        .from(clientProfiles)
        .where(eq(clientProfiles.userId, row.project.clientUserId));
      const clientName = clientProfile?.displayName || clientUser?.email || "A client";
      return { ...row, clientName };
    })
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Invitations</h1>

      {rowsWithClient.length === 0 ? (
        <p className="text-neutral-500">No invitations yet.</p>
      ) : (
        <ul className="space-y-3">
          {rowsWithClient.map(({ invitation, project, clientName }) => (
            <li key={invitation.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <Link href={`/projects/${project.id}`} className="font-medium hover:text-brand-600">
                  {project.title}
                </Link>
                <StatusBadge status={invitation.status} />
              </div>
              <p className="mb-2 text-sm text-neutral-500">
                From {clientName} ·{" "}
                {project.budgetMin && project.budgetMax
                  ? `$${project.budgetMin}–$${project.budgetMax}`
                  : "Budget not specified"}
              </p>
              {invitation.message && <p className="mb-3 text-sm text-neutral-600">{invitation.message}</p>}
              {invitation.status === "sent" && (
                <div className="flex gap-3">
                  <form action={acceptInvitation.bind(null, invitation.id)}>
                    <Button type="submit" size="sm">
                      Accept
                    </Button>
                  </form>
                  <form action={declineInvitation.bind(null, invitation.id)}>
                    <Button type="submit" variant="secondary" size="sm">
                      Decline
                    </Button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
