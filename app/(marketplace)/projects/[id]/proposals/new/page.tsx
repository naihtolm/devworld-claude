import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { SubmitProposalForm } from "@/modules/proposals/SubmitProposalForm";

export default async function NewProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();

  const user = await ensureCurrentUser();
  if (user?.id === project.clientUserId) {
    redirect(`/projects/${id}`);
  }
  if (project.status !== "published") {
    redirect(`/projects/${id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Submit a proposal</h1>
      <p className="mb-8 text-sm text-neutral-500">for &ldquo;{project.title}&rdquo;</p>
      <SubmitProposalForm projectId={project.id} defaultRateType={project.budgetType} />
    </main>
  );
}
