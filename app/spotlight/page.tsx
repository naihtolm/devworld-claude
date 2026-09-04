import { getRecentCompletedWork, getFeaturedDevelopers, getFeaturedCompanies } from "@/modules/marketplace/spotlight";
import { LinkCard } from "@/modules/ui/Card";

// Live queries, not something to freeze at build time — same reasoning as
// app/page.tsx.
export const dynamic = "force-dynamic";

export default async function SpotlightPage() {
  const recentWork = await getRecentCompletedWork(20);
  const featuredDevelopers = await getFeaturedDevelopers(6);
  const featuredCompanies = await getFeaturedCompanies(6);

  const nothingYet = recentWork.length === 0 && featuredDevelopers.length === 0 && featuredCompanies.length === 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 font-mono text-h1">
        <span className="text-brand-600">$</span> spotlight
      </h1>
      <p className="mb-10 max-w-xl text-neutral-600">
        Real work, delivered by real developers on Devworld.
      </p>

      {nothingYet && (
        <p className="text-neutral-500">
          Nothing to show yet — check back once the first projects are delivered.
        </p>
      )}

      {recentWork.length > 0 && (
        <div className="mb-12">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-500">
            {"// recently_completed"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {recentWork.map((w) => (
              <LinkCard key={w.agreementId} href={`/projects/${w.projectId}`}>
                <p className="mb-1 font-mono text-xs text-brand-600">delivered</p>
                <p className="font-medium text-neutral-900">{w.projectTitle}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {w.developerName} for {w.clientName}
                </p>
                {w.category && (
                  <span className="mt-3 inline-block rounded-card border border-neutral-300 px-2 py-0.5 font-mono text-xs font-medium text-neutral-600">
                    {w.category}
                  </span>
                )}
              </LinkCard>
            ))}
          </div>
        </div>
      )}

      {featuredDevelopers.length > 0 && (
        <div className="mb-12">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-500">
            {"// featured_developers"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {featuredDevelopers.map((d) => (
              <LinkCard key={d.id} href={`/developers/${d.id}`}>
                <p className="font-medium text-neutral-900">{d.name}</p>
                {d.headline && <p className="mt-1 text-sm text-neutral-500">{d.headline}</p>}
                <p className="mt-2 font-mono text-xs text-[#FCD34D]">
                  ★ {d.averageRating.toFixed(1)} · {d.reviewCount} review{d.reviewCount === 1 ? "" : "s"}
                </p>
              </LinkCard>
            ))}
          </div>
        </div>
      )}

      {featuredCompanies.length > 0 && (
        <div>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-500">
            {"// featured_companies"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {featuredCompanies.map((c) => (
              <LinkCard key={c.id} href={`/companies/${c.id}`}>
                <p className="font-medium text-neutral-900">{c.name}</p>
                {c.industry && <p className="mt-1 text-sm text-neutral-500">{c.industry}</p>}
                <p className="mt-2 font-mono text-xs text-neutral-500">{c.projectCount} projects posted</p>
              </LinkCard>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
