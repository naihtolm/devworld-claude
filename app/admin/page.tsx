import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { disputes, agreements, projects, users } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { StatusBadge } from "@/modules/ui/StatusBadge";

export default async function AdminDashboard() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) redirect("/sign-in");

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!dbUser?.isAdmin) redirect("/projects");

  const rows = await db
    .select({ dispute: disputes, agreement: agreements, project: projects })
    .from(disputes)
    .innerJoin(agreements, eq(disputes.agreementId, agreements.id))
    .leftJoin(projects, eq(agreements.projectId, projects.id))
    .orderBy(desc(disputes.createdAt));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Admin — Disputes</h1>

      {rows.length === 0 ? (
        <p className="text-neutral-500">No disputes.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ dispute, project }) => (
            <li
              key={dispute.id}
              className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-1 flex items-center justify-between">
                <Link href={`/admin/disputes/${dispute.id}`} className="font-medium hover:text-brand-600">
                  {dispute.reason}
                </Link>
                <StatusBadge status={dispute.status} />
              </div>
              <p className="text-sm text-neutral-500">
                {project?.title ?? "Unknown project"} · opened {new Date(dispute.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
