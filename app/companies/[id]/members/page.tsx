import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { companies, companyMemberships, users } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";
import { addCompanyMember, updateCompanyMemberRole, removeCompanyMember } from "@/modules/profiles/actions";
import { Avatar } from "@/modules/profiles/Avatar";
import { Card } from "@/modules/ui/Card";
import { Button } from "@/modules/ui/Button";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  hiring_manager: "Hiring Manager",
  member: "Member",
};

// DW-308
export default async function CompanyMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const { id } = await params;
  const [company] = await db.select().from(companies).where(eq(companies.id, id));
  if (!company) notFound();

  const currentUser = await ensureCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const [myMembership] = await db
    .select()
    .from(companyMemberships)
    .where(and(eq(companyMemberships.companyId, id), eq(companyMemberships.userId, currentUser.id)));
  const canManage = myMembership?.role === "owner" || myMembership?.role === "admin";
  if (!myMembership) redirect(`/companies/${id}`);

  const rows = await db
    .select({ membership: companyMemberships, user: users })
    .from(companyMemberships)
    .innerJoin(users, eq(companyMemberships.userId, users.id))
    .where(eq(companyMemberships.companyId, id));

  const members = await Promise.all(
    rows.map(async ({ membership, user }) => {
      const { name, imageUrl } = await getClerkDisplay(user.authProviderId);
      return { membership, name: name ?? user.email, email: user.email, imageUrl };
    })
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/companies/${id}`} className="mb-6 inline-block text-sm text-neutral-500 underline">
        ← {company.name}
      </Link>
      <h1 className="mb-8 text-h1">Team</h1>

      <ul className="mb-8 space-y-3">
        {members.map(({ membership, name, email, imageUrl }) => (
          <li key={membership.id}>
            <Card className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={name} imageUrl={imageUrl} size="sm" />
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-neutral-500">{email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {canManage && membership.role !== "owner" && membership.userId !== currentUser.id ? (
                  <form action={updateCompanyMemberRole} className="flex items-center gap-2">
                    <input type="hidden" name="companyId" value={id} />
                    <input type="hidden" name="membershipId" value={membership.id} />
                    <select
                      name="role"
                      defaultValue={membership.role}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="hiring_manager">Hiring Manager</option>
                      <option value="member">Member</option>
                    </select>
                  </form>
                ) : (
                  <span className="text-xs text-neutral-500">{ROLE_LABELS[membership.role]}</span>
                )}
                {canManage && membership.role !== "owner" && (
                  <form action={removeCompanyMember}>
                    <input type="hidden" name="companyId" value={id} />
                    <input type="hidden" name="membershipId" value={membership.id} />
                    <Button type="submit" variant="ghost" size="sm" className="p-0 text-red-500 hover:text-red-700">
                      Remove
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {canManage && (
        <>
          <h2 className="mb-3 text-h2">Add a team member</h2>
          <form action={addCompanyMember} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="companyId" value={id} />
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="teammate@company.com"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Role</label>
              <select name="role" defaultValue="member" className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
                <option value="admin">Admin</option>
                <option value="hiring_manager">Hiring Manager</option>
                <option value="member">Member</option>
              </select>
            </div>
            <Button type="submit" size="sm">
              Add
            </Button>
          </form>
          <p className="mt-2 text-xs text-neutral-400">
            They need a Devworld account already — this doesn&rsquo;t send an invite email.
          </p>
        </>
      )}
    </main>
  );
}
