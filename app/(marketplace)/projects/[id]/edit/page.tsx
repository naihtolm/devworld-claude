import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, projectSkills, skills, companyMemberships, companies } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { CreateProjectForm } from "@/modules/marketplace/CreateProjectForm";

// Design language G-1 — the other half of the fix: a draft saved from
// /projects/new used to have nowhere to go. This is that destination,
// reachable from the client dashboard's draft row or the project's own
// "Finish & publish" link.
export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const { saved } = await searchParams;

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();

  const user = await ensureCurrentUser();
  if (!user || project.clientUserId !== user.id) redirect(`/projects/${id}`);
  if (project.status !== "draft") redirect(`/projects/${id}`);

  const skillRows = await db
    .select({ name: skills.name })
    .from(projectSkills)
    .innerJoin(skills, eq(projectSkills.skillId, skills.id))
    .where(eq(projectSkills.projectId, id));

  const myCompanies = await db
    .select({ id: companies.id, name: companies.name })
    .from(companyMemberships)
    .innerJoin(companies, eq(companyMemberships.companyId, companies.id))
    .where(eq(companyMemberships.userId, user.id));

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-h1">Finish your draft</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Publish when it&rsquo;s ready — developers can only see it once you do.
      </p>
      {saved === "draft" && (
        <p className="mb-6 rounded-card bg-neutral-100 px-4 py-2 text-sm text-neutral-700">Saved as a draft.</p>
      )}
      <CreateProjectForm
        companies={myCompanies}
        existing={{
          id: project.id,
          title: project.title,
          description: project.description,
          category: project.category,
          budgetType: project.budgetType,
          budgetMin: project.budgetMin,
          budgetMax: project.budgetMax,
          timelineDays: project.timelineDays,
          visibility: project.visibility,
          companyId: project.companyId,
          skillNames: skillRows.map((s) => s.name),
        }}
      />
    </main>
  );
}
