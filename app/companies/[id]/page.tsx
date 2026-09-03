import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { companies, companyMemberships, projects } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [company] = await db.select().from(companies).where(eq(companies.id, id));
  if (!company) notFound();

  const publishedProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.companyId, id), eq(projects.status, "published")))
    .orderBy(desc(projects.createdAt))
    .limit(10);

  const { userId: authProviderId } = await auth();
  const currentUser = authProviderId ? await ensureCurrentUser() : null;
  let canEdit = false;
  if (currentUser) {
    const [membership] = await db
      .select()
      .from(companyMemberships)
      .where(and(eq(companyMemberships.companyId, id), eq(companyMemberships.userId, currentUser.id)));
    canEdit = membership?.role === "owner" || membership?.role === "admin";
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-4 flex items-start justify-between">
        <h1 className="text-h1">{company.name}</h1>
        {canEdit && (
          <div className="flex gap-4">
            <Link href={`/companies/${company.id}/members`} className="text-sm text-brand-600 underline">
              Team
            </Link>
            <Link href={`/companies/${company.id}/edit`} className="text-sm text-brand-600 underline">
              Edit company
            </Link>
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-4 text-sm text-neutral-500">
        {company.industry && <span>{company.industry}</span>}
        {company.size && <span>{company.size} employees</span>}
        {company.location && <span>{company.location}</span>}
        {company.website && (
          <a href={company.website} target="_blank" rel="noreferrer" className="text-brand-600 underline">
            Website
          </a>
        )}
      </div>

      {company.description && <p className="mb-8 whitespace-pre-wrap text-neutral-700">{company.description}</p>}

      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Posted projects</h2>
        {publishedProjects.length === 0 ? (
          <p className="text-sm text-neutral-400">No public projects yet.</p>
        ) : (
          <ul className="space-y-2">
            {publishedProjects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="text-sm text-brand-600 underline">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
