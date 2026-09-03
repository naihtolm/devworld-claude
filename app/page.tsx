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

const CATEGORY_ICONS: Record<string, string> = {
  "Web Development": "🌐",
  "Mobile Development": "📱",
  "AI / ML": "🤖",
  "Cloud / DevOps": "☁️",
  "Data Engineering": "🗄️",
  Design: "🎨",
  "QA / Testing": "🧪",
  Other: "🧩",
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
      <div className="mx-auto flex min-h-[75vh] max-w-5xl flex-col items-center justify-center gap-8 px-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Find technical talent.
          <br />
          Build great products.
        </h1>
        <p className="max-w-xl text-lg text-neutral-600">
          Devworld connects businesses with developers, AI/ML engineers, cloud
          specialists, and other technical professionals — for quick tasks,
          fixed-price projects, and ongoing work.
        </p>
        <div className="flex gap-4">
          <Link
            href="/projects"
            className="rounded-md bg-brand-600 px-5 py-3 font-medium text-white transition-colors hover:bg-brand-700"
          >
            Find Talent
          </Link>
          <Link
            href="/projects"
            className="rounded-md border border-neutral-300 px-5 py-3 font-medium transition-colors hover:bg-neutral-50"
          >
            Find Work
          </Link>
        </div>

        <dl className="mt-4 flex gap-10 sm:gap-16">
          <div>
            <dt className="text-3xl font-semibold text-brand-600">{activeProjects}+</dt>
            <dd className="text-sm text-neutral-500">Active projects</dd>
          </div>
          <div>
            <dt className="text-3xl font-semibold text-brand-600">{developers}+</dt>
            <dd className="text-sm text-neutral-500">Developers</dd>
          </div>
          <div>
            <dt className="text-3xl font-semibold text-brand-600">{completed}+</dt>
            <dd className="text-sm text-neutral-500">Completed</dd>
          </div>
        </dl>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="mb-4 text-lg font-semibold">Browse by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((category) => (
            <LinkCard key={category} href={`/projects?category=${encodeURIComponent(category)}`}>
              <span className="mb-2 block text-2xl">{CATEGORY_ICONS[category] ?? "🧩"}</span>
              <span className="block text-sm font-medium">{category}</span>
              <span className="text-xs text-neutral-400">{countByCategory.get(category) ?? 0} projects</span>
            </LinkCard>
          ))}
        </div>
      </div>

      {recentProjects.length > 0 && (
        <div className="mx-auto max-w-5xl px-6 pb-16">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recently posted</h2>
            <Link href="/projects" className="text-sm text-brand-600 underline">
              Browse all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {recentProjects.map((project) => (
              <LinkCard key={project.id} href={`/projects/${project.id}`}>
                <p className="font-medium text-neutral-900">{project.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{project.description}</p>
                <p className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                    {project.category}
                  </span>
                  <span className="capitalize">{project.budgetType}</span>
                </p>
              </LinkCard>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
