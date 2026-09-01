import { clerkClient } from "@clerk/nextjs/server";

export type GitHubRepo = {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  updatedAt: string;
  url: string;
};

// modules/profiles/README.md's "key differentiator": GitHub as proof-of-skill.
// Uses Clerk's existing social-connection OAuth token rather than a separate
// GitHub OAuth app — this Clerk instance already has GitHub sign-in enabled
// (shared dev credentials), so a developer who's connected GitHub through
// Clerk (sign-in or Account → Connected accounts) needs no extra setup.
export async function getGitHubAccessToken(authProviderId: string): Promise<string | null> {
  const clerk = await clerkClient();
  try {
    const { data } = await clerk.users.getUserOauthAccessToken(authProviderId, "github");
    return data[0]?.token ?? null;
  } catch {
    return null;
  }
}

// Public repos only, sorted by most recently updated — don't auto-import
// everything (some repos are junk/forks), the developer picks which to
// feature.
export async function fetchGitHubRepos(accessToken: string): Promise<GitHubRepo[]> {
  const res = await fetch("https://api.github.com/user/repos?per_page=30&sort=updated&affiliation=owner", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const repos = (await res.json()) as Array<{
    name: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    updated_at: string;
    html_url: string;
    fork: boolean;
  }>;

  return repos
    .filter((r) => !r.fork)
    .map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      updatedAt: r.updated_at,
      url: r.html_url,
    }));
}
