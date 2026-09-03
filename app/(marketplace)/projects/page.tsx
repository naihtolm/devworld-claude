import Link from "next/link";
import { db } from "@/db";
import { projects, projectSkills, skills } from "@/db/schema";
import { and, desc, eq, exists, gte, lte, or, isNull, sql } from "drizzle-orm";
import { CATEGORIES } from "@/modules/marketplace/categories";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";

// Postgres full-text search + filters (category, skill, budget range) — see
// modules/marketplace/README.md's V1 build order. Filter state lives in the
// URL (a plain GET form) rather than client state, so results stay
// server-rendered, bookmarkable, and shareable. Don't reach for
// Meilisearch/Algolia before this is actually slow.
//
// Explicit force-dynamic (searchParams usage already implies this, but
// being explicit avoids relying on that inference — see app/page.tsx for
// why: a page hitting the database shouldn't be a candidate for Next.js's
// build-time static generation at all).
export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; skill?: string; budgetMin?: string; budgetMax?: string }>;
}) {
  const { q, category, skill, budgetMin, budgetMax } = await searchParams;

  const conditions = [eq(projects.status, "published")];

  if (q?.trim()) {
    conditions.push(
      sql`to_tsvector('english', ${projects.title} || ' ' || ${projects.description}) @@ plainto_tsquery('english', ${q.trim()})`
    );
  }
  if (category) {
    conditions.push(eq(projects.category, category));
  }
  if (skill) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(projectSkills)
          .innerJoin(skills, eq(projectSkills.skillId, skills.id))
          .where(and(eq(projectSkills.projectId, projects.id), eq(skills.name, skill)))
      )
    );
  }
  const min = budgetMin ? Number(budgetMin) : undefined;
  if (min !== undefined && !Number.isNaN(min)) {
    conditions.push(or(isNull(projects.budgetMax), gte(projects.budgetMax, min.toString()))!);
  }
  const max = budgetMax ? Number(budgetMax) : undefined;
  if (max !== undefined && !Number.isNaN(max)) {
    conditions.push(or(isNull(projects.budgetMin), lte(projects.budgetMin, max.toString()))!);
  }

  const publishedProjects = await db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.createdAt))
    .limit(20);

  const allSkills = await db.select({ name: skills.name }).from(skills).orderBy(skills.name);

  const hasFilters = q || category || skill || budgetMin || budgetMax;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-6 text-h1">Browse Projects</h1>

      <form className="mb-8 space-y-3 rounded-card border border-neutral-200 bg-white p-4 shadow-card" action="/projects">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search title and description…"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <select name="category" defaultValue={category ?? ""} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">Any category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select name="skill" defaultValue={skill ?? ""} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">Any skill</option>
            {allSkills.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            name="budgetMin"
            type="number"
            min={0}
            defaultValue={budgetMin ?? ""}
            placeholder="Min budget"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            name="budgetMax"
            type="number"
            min={0}
            defaultValue={budgetMax ?? ""}
            placeholder="Max budget"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm">
            Search
          </Button>
          {hasFilters && (
            <Link href="/projects" className="text-sm text-neutral-500 underline">
              Clear filters
            </Link>
          )}
        </div>
      </form>

      {publishedProjects.length === 0 ? (
        <p className="text-neutral-500">
          {hasFilters
            ? "No projects match those filters."
            : "No published projects yet — this list will populate once the project-posting flow is built and someone posts one."}
        </p>
      ) : (
        <ul className="space-y-4">
          {publishedProjects.map((project) => (
            <li key={project.id}>
              <Card className="hover:shadow-popover">
                <Link href={`/projects/${project.id}`} className="font-medium text-neutral-900 hover:text-brand-600">
                  {project.title}
                </Link>
                <p className="mt-1 text-sm text-neutral-600">{project.description}</p>
                <p className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                    {project.category}
                  </span>
                  <span className="capitalize">{project.budgetType}</span>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
