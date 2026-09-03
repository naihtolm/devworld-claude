import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientProfiles, companyMemberships, companies } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { updateClientProfile } from "@/modules/profiles/actions";
import { Button, LinkButton } from "@/modules/ui/Button";

export default async function EditClientProfilePage() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) redirect("/sign-in");

  const [profile] = await db.select().from(clientProfiles).where(eq(clientProfiles.userId, user.id));

  const myCompanies = await db
    .select({ company: companies })
    .from(companyMemberships)
    .innerJoin(companies, eq(companyMemberships.companyId, companies.id))
    .where(eq(companyMemberships.userId, user.id));

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-h1">Client profile</h1>
      <form action={updateClientProfile} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Display name</label>
          <input
            name="displayName"
            defaultValue={profile?.displayName ?? ""}
            maxLength={150}
            placeholder="What developers will see you as"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Bio</label>
          <textarea
            name="bio"
            defaultValue={profile?.bio ?? ""}
            rows={5}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Location</label>
          <input
            name="location"
            defaultValue={profile?.location ?? ""}
            className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <Button type="submit">Save profile</Button>
      </form>

      <div className="mt-10 border-t border-neutral-200 pt-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Companies</h2>
        {myCompanies.length > 0 && (
          <ul className="mb-4 space-y-1">
            {myCompanies.map(({ company }) => (
              <li key={company.id}>
                <Link href={`/companies/${company.id}`} className="text-sm text-brand-600 underline">
                  {company.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <LinkButton href="/companies/new" variant="secondary" size="sm">
          Create a company
        </LinkButton>
      </div>
    </main>
  );
}
