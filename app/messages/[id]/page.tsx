import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  conversations,
  conversationParticipants,
  messages,
  users,
  projects,
} from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { sendMessage } from "@/modules/messaging/actions";
import { MessagePoller } from "@/modules/messaging/MessagePoller";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";
import { Avatar } from "@/modules/profiles/Avatar";
import { Button } from "@/modules/ui/Button";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const { id } = await params;

  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conversation) notFound();

  const currentUser = await ensureCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const [myParticipation] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(eq(conversationParticipants.conversationId, id), eq(conversationParticipants.userId, currentUser.id))
    );
  if (!myParticipation) redirect("/messages");

  const participantRows = await db
    .select({ user: users })
    .from(conversationParticipants)
    .innerJoin(users, eq(conversationParticipants.userId, users.id))
    .where(eq(conversationParticipants.conversationId, id));

  const otherUser = participantRows.find((p) => p.user.id !== currentUser.id)?.user;

  const { name: otherClerkName, imageUrl: otherImageUrl } = await getClerkDisplay(otherUser?.authProviderId);
  const otherName = otherClerkName ?? otherUser?.email ?? "Conversation";

  const project = conversation.projectId
    ? (await db.select().from(projects).where(eq(projects.id, conversation.projectId)))[0]
    : undefined;

  const thread = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return (
    <main className="mx-auto flex h-[calc(100vh-73px)] max-w-2xl flex-col px-6 py-8">
      <MessagePoller />
      <Link href="/messages" className="mb-4 inline-block text-sm text-neutral-500 underline">
        ← All conversations
      </Link>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={otherName} imageUrl={otherImageUrl} size="lg" />
        <div>
          <h1 className="text-xl font-semibold">{otherName}</h1>
          {project && <p className="text-sm text-neutral-500">{project.title}</p>}
        </div>
      </div>

      <div className="mb-4 flex-1 space-y-3 overflow-y-auto">
        {thread.length === 0 ? (
          <p className="text-sm text-neutral-400">No messages yet — say hello.</p>
        ) : (
          thread.map((m) => {
            const mine = m.senderUserId === currentUser.id;
            return (
              <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && <Avatar name={otherName} imageUrl={otherImageUrl} size="sm" />}
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form action={sendMessage} className="flex gap-2">
        <input type="hidden" name="conversationId" value={id} />
        <input
          name="body"
          required
          placeholder="Write a message…"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          autoComplete="off"
        />
        <Button type="submit">Send</Button>
      </form>
    </main>
  );
}
