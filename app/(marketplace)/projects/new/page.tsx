import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companyMemberships, companies } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { CreateProjectForm } from "@/modules/marketplace/CreateProjectForm";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { saved } = await searchParams;

  const user = await ensureCurrentUser();
  const myCompanies = user
    ? await db
        .select({ id: companies.id, name: companies.name })
        .from(companyMemberships)
        .innerJoin(companies, eq(companyMemberships.companyId, companies.id))
        .where(eq(companyMemberships.userId, user.id))
    : [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Post a project</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Describe what you need built — developers will be able to browse and
        submit proposals once it&rsquo;s published.
      </p>
      {saved === "draft" && (
        <p className="mb-6 rounded-md bg-neutral-100 px-4 py-2 text-sm text-neutral-700">
          Saved as a draft.
        </p>
      )}
      <CreateProjectForm companies={myCompanies} />
    </main>
  );
}
