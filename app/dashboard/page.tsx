import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureCurrentUser } from "@/modules/auth/user";
import { getUserRoles } from "@/modules/profiles/roles";
import { ClientDashboard } from "@/app/dashboard/ClientDashboard";
import { DeveloperDashboard } from "@/app/dashboard/DeveloperDashboard";

// Design language G-4: this used to be unconditionally the client's "My
// Projects" view — a developer landed here and saw an empty, nonsensical
// version of someone else's dashboard. There's no `role` column (onboarding
// explicitly supports holding both profiles at once), so which dashboard(s)
// render is derived from which profile rows actually exist.
export default async function DashboardPage({
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
  const view = requested === "developer" && roles.isDeveloper
    ? "developer"
    : requested === "client" && roles.isClient
      ? "client"
      : roles.isClient
        ? "client"
        : "developer";

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {roles.isClient && roles.isDeveloper && (
        <div className="mb-6 flex gap-1 border-b border-neutral-200">
          <Link
            href="/dashboard?view=client"
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              view === "client" ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Client view
          </Link>
          <Link
            href="/dashboard?view=developer"
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              view === "developer" ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Developer view
          </Link>
        </div>
      )}

      {view === "client" ? (
        <ClientDashboard userId={user.id} />
      ) : (
        <DeveloperDashboard developerProfileId={roles.developerProfileId!} />
      )}
    </main>
  );
}
