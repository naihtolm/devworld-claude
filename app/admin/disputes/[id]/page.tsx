import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  disputes,
  agreements,
  projects,
  users,
  milestones,
  conversations,
  messages,
} from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { resolveDispute } from "@/modules/admin/actions";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";
import { StatusBadge } from "@/modules/ui/StatusBadge";
import { Button } from "@/modules/ui/Button";

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) redirect("/sign-in");

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!dbUser?.isAdmin) redirect("/projects");

  const { id } = await params;
  const [dispute] = await db.select().from(disputes).where(eq(disputes.id, id));
  if (!dispute) notFound();

  const [agreement] = await db.select().from(agreements).where(eq(agreements.id, dispute.agreementId));
  const [project] = agreement
    ? await db.select().from(projects).where(eq(projects.id, agreement.projectId))
    : [];
  const [milestone] = dispute.milestoneId
    ? await db.select().from(milestones).where(eq(milestones.id, dispute.milestoneId))
    : [];
  const [openedByUser] = await db.select().from(users).where(eq(users.id, dispute.openedByUserId));

  const [conversation] = agreement
    ? await db.select().from(conversations).where(eq(conversations.agreementId, agreement.id))
    : [];
  const thread = conversation
    ? await db.select().from(messages).where(eq(messages.conversationId, conversation.id)).orderBy(asc(messages.createdAt))
    : [];

  const threadWithNames = await Promise.all(
    thread.map(async (m) => {
      const [sender] = await db.select().from(users).where(eq(users.id, m.senderUserId));
      const { name: clerkName } = await getClerkDisplay(sender?.authProviderId);
      const name = clerkName ?? sender?.email ?? "Unknown";
      return { ...m, senderName: name };
    })
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/admin" className="mb-6 inline-block text-sm text-neutral-500 underline">
        ← All disputes
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{dispute.reason}</h1>
        <StatusBadge status={dispute.status} />
      </div>

      {dispute.description && <p className="mb-6 whitespace-pre-wrap text-neutral-700">{dispute.description}</p>}

      <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 text-sm shadow-sm">
        <p className="mb-1">
          <span className="text-neutral-500">Opened by:</span> {openedByUser?.email}
        </p>
        <p className="mb-1">
          <span className="text-neutral-500">Project:</span>{" "}
          {project ? (
            <Link href={`/projects/${project.id}`} className="text-brand-600 underline">
              {project.title}
            </Link>
          ) : (
            "Unknown"
          )}
        </p>
        <p className="mb-1">
          <span className="text-neutral-500">Agreement:</span>{" "}
          {agreement ? (
            <Link href={`/agreements/${agreement.id}`} className="text-brand-600 underline">
              {agreement.id}
            </Link>
          ) : (
            "Unknown"
          )}
        </p>
        {milestone && (
          <p>
            <span className="text-neutral-500">Milestone:</span> {milestone.title} (${milestone.amount})
          </p>
        )}
      </div>

      <div className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Message history</h2>
        {threadWithNames.length === 0 ? (
          <p className="text-sm text-neutral-400">No messages found.</p>
        ) : (
          <ul className="space-y-2 rounded-md border border-neutral-200 bg-white p-3 shadow-sm">
            {threadWithNames.map((m) => (
              <li key={m.id} className="text-sm">
                <span className="font-medium">{m.senderName}:</span> {m.body}
                <span className="ml-2 text-xs text-neutral-400">
                  {new Date(m.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dispute.status === "resolved" || dispute.status === "closed" ? (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="mb-1 font-medium">Resolution</p>
          <p>{dispute.resolution}</p>
        </div>
      ) : (
        <form action={resolveDispute} className="space-y-3 rounded-md border border-dashed p-4">
          <input type="hidden" name="disputeId" value={dispute.id} />
          <div>
            <label className="mb-1 block text-sm font-medium">Resolution</label>
            <textarea
              name="resolution"
              required
              rows={4}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="What was decided and why"
            />
          </div>
          <Button type="submit">Resolve dispute</Button>
        </form>
      )}
    </main>
  );
}
