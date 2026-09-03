import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { developerProfiles, developerSkills, skills } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { DeveloperProfileForm } from "@/modules/profiles/DeveloperProfileForm";
import { getGitHubAccessToken, fetchGitHubRepos } from "@/modules/profiles/github";
import { importGitHubRepos } from "@/modules/profiles/actions";
import { Button } from "@/modules/ui/Button";

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

  const githubToken = await getGitHubAccessToken(authProviderId);
  const githubRepos = githubToken ? await fetchGitHubRepos(githubToken) : [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-h1">Developer profile</h1>
      <DeveloperProfileForm profile={profile} skillNames={currentSkills.map((s) => s.name)} />

      <div className="mt-10 border-t border-neutral-200 pt-6">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">Import portfolio from GitHub</h2>
        {!githubToken ? (
          <p className="text-sm text-neutral-500">
            Connect GitHub to import repos as portfolio items — click your avatar (top right) →{" "}
            <strong>Manage account</strong> → <strong>Connected accounts</strong>, then come back here.
          </p>
        ) : githubRepos.length === 0 ? (
          <p className="text-sm text-neutral-400">No public repos found on your GitHub account.</p>
        ) : (
          <form action={importGitHubRepos} className="space-y-3">
            <ul className="max-h-96 space-y-2 overflow-y-auto rounded-md border border-neutral-200 p-3">
              {githubRepos.map((repo) => (
                <li key={repo.url} className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="repos"
                    value={JSON.stringify({
                      name: repo.name,
                      description: repo.description ?? undefined,
                      language: repo.language ?? undefined,
                      url: repo.url,
                    })}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{repo.name}</p>
                    {repo.description && <p className="text-neutral-500">{repo.description}</p>}
                    <p className="text-xs text-neutral-400">
                      {repo.language && `${repo.language} · `}★ {repo.stars}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <Button type="submit" variant="secondary" size="sm">
              Import selected
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
