import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { reports, users } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { updateReportStatus } from "@/modules/admin/actions";
import { StatusBadge } from "@/modules/ui/StatusBadge";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";

export default async function AdminReportsPage() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) redirect("/sign-in");

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!dbUser?.isAdmin) redirect("/projects");

  const rows = await db
    .select({ report: reports, reporter: users })
    .from(reports)
    .innerJoin(users, eq(reports.reporterUserId, users.id))
    .orderBy(desc(reports.createdAt));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-h1">Admin — Reports</h1>

      {rows.length === 0 ? (
        <p className="text-neutral-500">No reports.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ report, reporter }) => (
            <li key={report.id}>
              <Card>
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-medium">{report.reason}</p>
                  <StatusBadge status={report.status} />
                </div>
                <p className="mb-3 text-sm text-neutral-500">
                  {report.targetType} · target {report.targetId.slice(0, 8)}… · reported by {reporter.email} ·{" "}
                  {new Date(report.createdAt).toLocaleDateString()}
                </p>
                {report.status === "open" && (
                  <form action={updateReportStatus} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="reportId" value={report.id} />
                    <input
                      name="notes"
                      placeholder="Notes (optional)"
                      className="min-w-[10rem] flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
                    />
                    <Button type="submit" name="decision" value="dismissed" variant="secondary" size="sm">
                      Dismiss
                    </Button>
                    <Button type="submit" name="decision" value="reviewed" variant="secondary" size="sm">
                      Mark reviewed
                    </Button>
                    <Button type="submit" name="decision" value="actioned" size="sm">
                      Take action
                    </Button>
                  </form>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
