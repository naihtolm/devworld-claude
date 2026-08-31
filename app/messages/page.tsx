import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, desc, and, ne } from "drizzle-orm";
import { db } from "@/db";
import { conversations, conversationParticipants, users, projects, messages } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";
import { Avatar } from "@/modules/profiles/Avatar";

export default async function MessagesPage() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const currentUser = await ensureCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const myConversations = await db
    .select({ conversation: conversations })
    .from(conversationParticipants)
    .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
    .where(eq(conversationParticipants.userId, currentUser.id))
    .orderBy(desc(conversations.createdAt));

  const rows = await Promise.all(
    myConversations.map(async ({ conversation }) => {
      const [otherParticipant] = await db
        .select({ user: users })
        .from(conversationParticipants)
        .innerJoin(users, eq(conversationParticipants.userId, users.id))
        .where(
          and(
            eq(conversationParticipants.conversationId, conversation.id),
            ne(conversationParticipants.userId, currentUser.id)
          )
        );

      const { name: clerkName, imageUrl } = await getClerkDisplay(otherParticipant?.user.authProviderId);
      const name = clerkName ?? otherParticipant?.user.email ?? "Conversation";

      const project = conversation.projectId
        ? (await db.select().from(projects).where(eq(projects.id, conversation.projectId)))[0]
        : undefined;

      const [lastMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      return { conversation, name, imageUrl, project, lastMessage };
    })
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Messages</h1>

      {rows.length === 0 ? (
        <p className="text-neutral-500">No conversations yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ conversation, name, imageUrl, project, lastMessage }) => (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <Avatar name={name} imageUrl={imageUrl} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium">{name}</span>
                    {project && <span className="text-xs text-neutral-400">{project.title}</span>}
                  </div>
                  <p className="line-clamp-1 text-sm text-neutral-500">
                    {lastMessage?.body ?? "No messages yet"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
