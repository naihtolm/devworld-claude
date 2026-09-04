import { GUIDE_GROUPS } from "@/modules/guides/content";
import { LinkCard } from "@/modules/ui/Card";

export default function GuidesPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 font-mono text-h1">
        <span className="text-brand-600">$</span> guides
      </h1>
      <p className="mb-10 max-w-xl text-neutral-600">
        Short, practical guides on pricing, proposals, and how the platform works.
      </p>

      {GUIDE_GROUPS.map((group) => (
        <div key={group.heading} className="mb-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-500">{group.heading}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.guides.map((guide) => (
              <LinkCard key={guide.slug} href={`/guides/${guide.slug}`}>
                <p className="font-medium text-neutral-900">{guide.title}</p>
                <p className="mt-1 text-sm text-neutral-600">{guide.summary}</p>
              </LinkCard>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
