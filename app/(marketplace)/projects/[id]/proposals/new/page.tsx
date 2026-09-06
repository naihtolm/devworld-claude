import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { SubmitProposalForm } from "@/modules/proposals/SubmitProposalForm";
import { TourAutoStart, TourReplayButton } from "@/modules/tours/TourTrigger";

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
      <TourAutoStart tourId="submit-a-proposal" />
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-h1">Submit a proposal</h1>
        <TourReplayButton tourId="submit-a-proposal" />
      </div>
      <p className="mb-8 text-sm text-neutral-500">for &ldquo;{project.title}&rdquo;</p>
      <SubmitProposalForm projectId={project.id} defaultRateType={project.budgetType} />
    </main>
  );
}
