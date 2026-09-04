import Link from "next/link";
import { LinkCard } from "@/modules/ui/Card";
import type { RecentCompletedWork } from "@/modules/marketplace/spotlight";

export function SpotlightSection({ recentWork }: { recentWork: RecentCompletedWork[] }) {
  if (recentWork.length === 0) return null;

  return (
    <div className="mx-auto max-w-5xl px-6 pb-16">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-wider text-neutral-500">
          {"// community_spotlight"}
        </h2>
        <Link href="/spotlight" className="font-mono text-sm text-brand-600 underline">
          see_more →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {recentWork.map((w) => (
          <LinkCard key={w.agreementId} href={`/projects/${w.projectId}`}>
            <p className="mb-1 font-mono text-xs text-brand-600">delivered</p>
            <p className="font-medium text-neutral-900">{w.projectTitle}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {w.developerName} for {w.clientName}
            </p>
          </LinkCard>
        ))}
      </div>
    </div>
  );
}
