import {
  getHourlyRateTrendRows,
  pickTopCategories,
  buildMonthRange,
  buildTrendSeries,
} from "@/modules/marketplace/rateTrends";
import { RateTrendsChart } from "@/modules/marketplace/RateTrendsChart";
import { Card } from "@/modules/ui/Card";

// DB-backed, not build-time static — same reasoning as app/page.tsx.
export const dynamic = "force-dynamic";

const MONTHS_BACK = 6;

export default async function TrendsPage() {
  const rows = await getHourlyRateTrendRows(MONTHS_BACK);
  const months = buildMonthRange(MONTHS_BACK);
  const topCategories = pickTopCategories(rows, 5);
  const series = buildTrendSeries(rows, months, topCategories);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 font-mono text-h1">
        <span className="text-brand-600">$</span> trends
      </h1>
      <p className="mb-10 max-w-xl text-neutral-600">
        Average hourly rate proposed by developers, by project category, over the last {MONTHS_BACK} months.
      </p>

      {topCategories.length === 0 ? (
        <Card>
          <p className="text-neutral-500">
            Not enough hourly proposals yet to show a trend — check back once more come in.
          </p>
        </Card>
      ) : (
        <Card>
          <RateTrendsChart months={months} series={series} />
        </Card>
      )}
    </main>
  );
}
