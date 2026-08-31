import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createCompany } from "@/modules/profiles/actions";
import { Button } from "@/modules/ui/Button";

export default async function NewCompanyPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Create a company</h1>
      <form action={createCompany} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Company name</label>
          <input
            name="name"
            required
            maxLength={150}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea name="description" rows={4} className="w-full rounded-md border border-neutral-300 px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Website</label>
            <input name="website" className="w-full rounded-md border border-neutral-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Industry</label>
            <input name="industry" className="w-full rounded-md border border-neutral-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Size</label>
            <input name="size" placeholder="e.g. 1-10, 50-200" className="w-full rounded-md border border-neutral-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Location</label>
            <input name="location" className="w-full rounded-md border border-neutral-300 px-3 py-2" />
          </div>
        </div>
        <Button type="submit">Create company</Button>
      </form>
    </main>
  );
}
