import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { and, eq, inArray, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { agreements, payments, projects } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { getUserRoles } from "@/modules/profiles/roles";
import { Card } from "@/modules/ui/Card";
import { StatusBadge } from "@/modules/ui/StatusBadge";

const EARNING_TYPES = ["milestone_payout", "hourly_invoice"] as const;
const SPEND_TYPES = ["milestone_funding", "hourly_invoice"] as const;

// DW-501b — payment history only ever existed per-agreement before this;
// a developer with several active agreements had no single place to see
// total earnings, and a client had no single spend summary.
export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) redirect("/sign-in");

  const roles = await getUserRoles(user.id);
  if (!roles.isClient && !roles.isDeveloper) redirect("/onboarding");

  const requested = (await searchParams).view;
  const view =
    requested === "developer" && roles.isDeveloper
      ? "developer"
      : requested === "client" && roles.isClient
        ? "client"
        : roles.isDeveloper
          ? "developer"
          : "client";

  const agreementFilter =
    view === "developer" ? eq(agreements.developerProfileId, roles.developerProfileId!) : eq(agreements.clientUserId, user.id);

  const rows = await db
    .select({ payment: payments, project: projects })
    .from(payments)
    .innerJoin(agreements, eq(payments.agreementId, agreements.id))
    .innerJoin(projects, eq(agreements.projectId, projects.id))
    .where(
      and(
        agreementFilter,
        inArray(payments.type, view === "developer" ? EARNING_TYPES : SPEND_TYPES),
        eq(payments.status, "succeeded")
      )
    )
    .orderBy(desc(payments.createdAt))
    .limit(50);

  const [{ total } = { total: "0" }] = rows.length
    ? await db
        .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .innerJoin(agreements, eq(payments.agreementId, agreements.id))
        .where(
          and(
            agreementFilter,
            inArray(payments.type, view === "developer" ? EARNING_TYPES : SPEND_TYPES),
            eq(payments.status, "succeeded")
          )
        )
    : [];

  const TYPE_LABELS: Record<string, string> = {
    milestone_payout: "Milestone payout",
    hourly_invoice: view === "developer" ? "Hourly invoice paid" : "Hourly invoice",
    milestone_funding: "Milestone funded",
    refund: "Refund",
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {roles.isClient && roles.isDeveloper && (
        <div className="mb-6 flex gap-1 border-b border-neutral-200">
          <Link
            href="/earnings?view=client"
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              view === "client" ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Spending
          </Link>
          <Link
            href="/earnings?view=developer"
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              view === "developer" ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Earnings
          </Link>
        </div>
      )}

      <h1 className="mb-2 text-h1">{view === "developer" ? "Earnings" : "Spending"}</h1>
      <p className="mb-8 text-3xl font-semibold text-brand-600 tabular-nums">${Number(total).toLocaleString()}</p>

      {rows.length === 0 ? (
        <p className="text-neutral-500">
          {view === "developer" ? "No payouts yet." : "No payments made yet."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ payment, project }) => (
            <li key={payment.id}>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{TYPE_LABELS[payment.type] ?? payment.type}</p>
                    <p className="text-xs text-neutral-500">
                      {project.title} · {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium tabular-nums">${Number(payment.amount).toLocaleString()}</span>
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
