import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { developerProfiles, developerSkills, skills } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { DeveloperProfileForm } from "@/modules/profiles/DeveloperProfileForm";

export default async function EditDeveloperProfilePage() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) redirect("/sign-in");

  const [profile] = await db.select().from(developerProfiles).where(eq(developerProfiles.userId, user.id));

  const currentSkills = profile
    ? await db
        .select({ name: skills.name })
        .from(developerSkills)
        .innerJoin(skills, eq(developerSkills.skillId, skills.id))
        .where(eq(developerSkills.developerProfileId, profile.id))
    : [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Developer profile</h1>
      <DeveloperProfileForm profile={profile} skillNames={currentSkills.map((s) => s.name)} />
    </main>
  );
}
