import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { companies, companyMemberships } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { updateCompany } from "@/modules/profiles/actions";
import { Button } from "@/modules/ui/Button";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const { id } = await params;
  const [company] = await db.select().from(companies).where(eq(companies.id, id));
  if (!company) notFound();

  const user = await ensureCurrentUser();
  const [membership] = user
    ? await db
        .select()
        .from(companyMemberships)
        .where(and(eq(companyMemberships.companyId, id), eq(companyMemberships.userId, user.id)))
    : [];
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    redirect(`/companies/${id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Edit {company.name}</h1>
      <form action={updateCompany} className="space-y-6">
        <input type="hidden" name="companyId" value={company.id} />
        <div>
          <label className="mb-1 block text-sm font-medium">Company name</label>
          <input
            name="name"
            required
            defaultValue={company.name}
            maxLength={150}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            name="description"
            defaultValue={company.description ?? ""}
            rows={4}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Website</label>
            <input
              name="website"
              defaultValue={company.website ?? ""}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Industry</label>
            <input
              name="industry"
              defaultValue={company.industry ?? ""}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Size</label>
            <input
              name="size"
              defaultValue={company.size ?? ""}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Location</label>
            <input
              name="location"
              defaultValue={company.location ?? ""}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>
        </div>
        <Button type="submit">Save company</Button>
      </form>
    </main>
  );
}
