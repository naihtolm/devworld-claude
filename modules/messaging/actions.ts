"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, and, isNull, exists, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  agreements,
  developerProfiles,
  projects,
  conversations,
  conversationParticipants,
  messages,
} from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";

async function requireCurrentDbUser() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) {
    throw new Error("Could not resolve the signed-in user.");
  }
  return user;
}

// Every conversation ties back to an agreement (or, in a later slice, a
// project pre-agreement) so context survives if a dispute happens later —
// see modules/messaging/README.md.
export async function getOrCreateAgreementConversation(agreementId: string) {
  const user = await requireCurrentDbUser();

  const [agreement] = await db.select().from(agreements).where(eq(agreements.id, agreementId));
  if (!agreement) throw new Error("Not found.");

  const [developer] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.id, agreement.developerProfileId));

  const isClient = agreement.clientUserId === user.id;
  const isDeveloper = developer?.userId === user.id;
  if (!isClient && !isDeveloper) throw new Error("Not found.");

  const [existing] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.agreementId, agreementId));

  let conversationId = existing?.id;
  if (!conversationId) {
    const [created] = await db
      .insert(conversations)
      .values({ agreementId, projectId: agreement.projectId })
      .returning();
    conversationId = created.id;

    await db.insert(conversationParticipants).values([
      { conversationId, userId: agreement.clientUserId },
      { conversationId, userId: developer!.userId },
    ]);
  }

  redirect(`/messages/${conversationId}`);
}

// Pre-agreement messaging (modules/proposals/README.md's "message" action
// on the proposal detail screen): a client and a specific developer talking
// about a project before any proposal is accepted. A project can have many
// proposals from different developers, so this isn't just "the" conversation
// for a project — it's keyed to this exact (project, developer) pair, found
// via an EXISTS check on both participants rather than projectId alone.
export async function getOrCreateProjectConversation(projectId: string, developerProfileId: string) {
  const user = await requireCurrentDbUser();

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new Error("Not found.");

  const [developer] = await db
    .select()
    .from(developerProfiles)
    .where(eq(developerProfiles.id, developerProfileId));
  if (!developer) throw new Error("Not found.");

  const isClient = project.clientUserId === user.id;
  const isDeveloper = developer.userId === user.id;
  if (!isClient && !isDeveloper) throw new Error("Not found.");

  const hasParticipant = (userId: string) =>
    exists(
      db
        .select({ one: sql`1` })
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversations.id),
            eq(conversationParticipants.userId, userId)
          )
        )
    );

  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.projectId, projectId),
        isNull(conversations.agreementId),
        hasParticipant(project.clientUserId),
        hasParticipant(developer.userId)
      )
    );

  let conversationId = existing?.id;
  if (!conversationId) {
    const [created] = await db.insert(conversations).values({ projectId }).returning();
    conversationId = created.id;

    await db.insert(conversationParticipants).values([
      { conversationId, userId: project.clientUserId },
      { conversationId, userId: developer.userId },
    ]);
  }

  redirect(`/messages/${conversationId}`);
}

async function requireParticipant(conversationId: string) {
  const user = await requireCurrentDbUser();

  const [participant] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, user.id)
      )
    );
  if (!participant) throw new Error("Not found.");
  return user;
}

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});

export async function sendMessage(formData: FormData) {
  const parsed = sendMessageSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return;
  const values = parsed.data;

  const user = await requireParticipant(values.conversationId);

  await db.insert(messages).values({
    conversationId: values.conversationId,
    senderUserId: user.id,
    body: values.body,
  });

  revalidatePath(`/messages/${values.conversationId}`);
}
