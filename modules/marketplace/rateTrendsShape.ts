// Pure data-shaping for the rate-trends chart — no `db` import, so it can
// be unit tested without a DATABASE_URL (db/index.ts throws at import time
// otherwise). The DB query itself lives in rateTrends.ts, which re-exports
// everything here.

export type RateTrendRow = { month: string; category: string; avgRate: number; count: number };

// Picks the categories with the most data rather than alphabetically, so
// the chart's limited series slots (dataviz skill: soft cap 5-6) go to the
// categories that actually have a trend worth showing.
export function pickTopCategories(rows: RateTrendRow[], limit = 5): string[] {
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.category, (totals.get(r.category) ?? 0) + r.count);
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category);
}

// "YYYY-MM" for each of the last `monthsBack` months, oldest first — the
// fixed x-axis the chart plots against, independent of which months
// actually have data.
export function buildMonthRange(monthsBack = 6): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export type RateTrendSeries = { key: string; label: string; values: (number | null)[] };

// Reshapes the flat query rows into one array-of-values-per-month per
// category, aligned to `months` — the shape the chart component wants.
export function buildTrendSeries(rows: RateTrendRow[], months: string[], categories: string[]): RateTrendSeries[] {
  const byKey = new Map(rows.map((r) => [`${r.month}__${r.category}`, r.avgRate]));
  return categories.map((category) => ({
    key: category,
    label: category,
    values: months.map((month) => byKey.get(`${month}__${category}`) ?? null),
  }));
}
