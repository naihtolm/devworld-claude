import { LinkCard } from "@/modules/ui/Card";
import type { FeaturedReview, PlatformTrustSummary } from "@/modules/reviews/platformTrust";

function Stars({ rating }: { rating: number }) {
  return (
    <p className="font-medium text-[#FCD34D]">
      {"★".repeat(rating)}
      <span className="text-neutral-300">{"★".repeat(5 - rating)}</span>
    </p>
  );
}

// Ternary of literal class strings, not a template-interpolated one — the
// Tailwind class scanner needs every candidate class name to appear
// verbatim somewhere in the file, not built at runtime.
function gridClass(count: number) {
  if (count >= 3) return "sm:grid-cols-3";
  if (count === 2) return "sm:grid-cols-2";
  return "max-w-sm sm:grid-cols-1";
}

export function TrustSection({
  summary,
  featured,
  subcopy,
}: {
  summary: PlatformTrustSummary;
  featured: FeaturedReview[];
  subcopy: string;
}) {
  if (summary.totalReviews === 0) return null;

  return (
    <div className="mx-auto max-w-5xl px-6 pb-16">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-neutral-500">
          {"// what_people_are_saying"}
        </h2>
        {summary.averageRating !== null && (
          <p className="font-mono text-sm text-neutral-500">
            ★ {summary.averageRating.toFixed(1)} average · {summary.totalReviews} review
            {summary.totalReviews === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {featured.length > 0 && (
        <div className={`grid gap-3 ${gridClass(featured.length)}`}>
          {featured.map((r) => (
            <LinkCard key={r.id} href={r.href}>
              <Stars rating={r.rating} />
              <p className="mt-2 line-clamp-3 text-sm text-neutral-600">&ldquo;{r.comment}&rdquo;</p>
              <p className="mt-2 text-xs font-medium text-neutral-900">{r.name}</p>
            </LinkCard>
          ))}
        </div>
      )}

      <p className="mt-3 font-mono text-xs text-neutral-400">{subcopy}</p>
    </div>
  );
}
