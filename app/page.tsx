import Link from "next/link";
import { count, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { projects, developerProfiles, agreements } from "@/db/schema";
import { CATEGORIES } from "@/modules/marketplace/categories";
import { LinkCard } from "@/modules/ui/Card";

// Live counts, not something to freeze at build time — also sidesteps
// Next.js attempting to statically prerender this against the database
// during the Vercel build step, where a slow/misconfigured DB connection
// can hang the whole build rather than just a request.
export const dynamic = "force-dynamic";

// Bracket-mono tags, not emoji — matches the approved Terminal direction's
// category treatment (design canvas, DesignSystem/Main artboards).
const CATEGORY_TAGS: Record<string, string> = {
  "Web Development": "web",
  "Mobile Development": "mobile",
  "AI / ML": "ai/ml",
  "Cloud / DevOps": "cloud",
  "Data Engineering": "data",
  Design: "design",
  "QA / Testing": "qa",
  Other: "other",
};

export default async function HomePage() {
  // Sequential, not Promise.all — the pooled connection is a single socket
  // (max: 1), and firing several queries at once against a fresh serverless
  // connection here reproducibly hung in production (Vercel) even though it
  // worked locally; awaiting one at a time is the tradeoff that avoids it.
  const [{ activeProjects }] = await db
    .select({ activeProjects: count() })
    .from(projects)
    .where(eq(projects.status, "published"));
  const [{ developers }] = await db.select({ developers: count() }).from(developerProfiles);
  const [{ completed }] = await db
    .select({ completed: count() })
    .from(agreements)
    .where(eq(agreements.status, "completed"));
  const categoryCounts = await db
    .select({ category: projects.category, count: count() })
    .from(projects)
    .where(eq(projects.status, "published"))
    .groupBy(projects.category);
  const recentProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.status, "published"))
    .orderBy(desc(projects.createdAt))
    .limit(4);

  const countByCategory = new Map(categoryCounts.map((c) => [c.category, c.count]));

  return (
    <main>
      <div className="mx-auto flex min-h-[75vh] max-w-5xl flex-col items-center justify-center gap-7 px-6 text-center">
        <p
          className="fadeup font-mono text-sm text-neutral-500"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="text-brand-600">$</span> devworld init --marketplace
        </p>

        <h1 className="font-mono text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          {/* 22 characters — --tw-chars must match, or the caret overshoots
              (a real bug caught in the design canvas review before this
              shipped: width animating against the wrong basis). */}
          <span className="typewriter" style={{ "--tw-chars": "22ch" } as React.CSSProperties}>
            Find technical talent.
          </span>
          <br />
          <span className="fadeup" style={{ animationDelay: "1.9s" }}>
            Build great products.
          </span>
        </h1>

        <p className="fadeup max-w-xl text-lg text-neutral-600" style={{ animationDelay: "2.1s" }}>
          Devworld connects businesses with developers, AI/ML engineers, cloud
          specialists, and other technical professionals — for quick tasks,
          fixed-price projects, and ongoing work.
        </p>
        <div className="fadeup flex gap-4" style={{ animationDelay: "2.25s" }}>
          <Link
            href="/projects"
            className="rounded-card bg-brand-600 px-5 py-3 font-mono font-medium text-white transition-shadow hover:shadow-glow"
          >
            Find Talent →
          </Link>
          <Link
            href="/projects"
            className="rounded-card border border-neutral-300 px-5 py-3 font-medium transition-colors hover:border-brand-600"
          >
            Find Work
          </Link>
        </div>

        <dl className="fadeup mt-4 flex gap-10 font-mono sm:gap-16" style={{ animationDelay: "2.4s" }}>
          <div>
            <dt className="text-3xl font-bold text-brand-600">{activeProjects}+</dt>
            <dd className="text-xs text-neutral-500">active_projects</dd>
          </div>
          <div>
            <dt className="text-3xl font-bold text-brand-600">{developers}+</dt>
            <dd className="text-xs text-neutral-500">developers</dd>
          </div>
          <div>
            <dt className="text-3xl font-bold text-brand-600">{completed}+</dt>
            <dd className="text-xs text-neutral-500">completed</dd>
          </div>
        </dl>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-500">
          {"// browse_by_category"}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((category) => (
            <LinkCard key={category} href={`/projects?category=${encodeURIComponent(category)}`}>
              <span className="mb-2 block font-mono text-sm text-brand-600">
                [{CATEGORY_TAGS[category] ?? "other"}]
              </span>
              <span className="block text-sm font-medium">{category}</span>
              <span className="font-mono text-xs text-neutral-500">
                {countByCategory.get(category) ?? 0} open
              </span>
            </LinkCard>
          ))}
        </div>
      </div>

      {recentProjects.length > 0 && (
        <div className="mx-auto max-w-5xl px-6 pb-16">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-wider text-neutral-500">
              {"// recently_posted"}
            </h2>
            <Link href="/projects" className="font-mono text-sm text-brand-600 underline">
              browse_all →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {recentProjects.map((project) => (
              <LinkCard key={project.id} href={`/projects/${project.id}`}>
                <p className="font-medium text-neutral-900">{project.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{project.description}</p>
                <p className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                  <span className="rounded-card border border-neutral-300 px-2 py-0.5 font-mono font-medium text-neutral-600">
                    {project.category}
                  </span>
                  <span className="font-mono capitalize">{project.budgetType}</span>
                </p>
              </LinkCard>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
