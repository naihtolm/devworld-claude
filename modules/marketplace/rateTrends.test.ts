import { describe, it, expect } from "vitest";
import { pickTopCategories, buildMonthRange, formatMonthLabel, buildTrendSeries, type RateTrendRow } from "./rateTrendsShape";

describe("pickTopCategories", () => {
  it("ranks by total count across months, not alphabetically", () => {
    const rows: RateTrendRow[] = [
      { month: "2026-01", category: "Design", avgRate: 50, count: 1 },
      { month: "2026-02", category: "Web Development", avgRate: 60, count: 5 },
      { month: "2026-01", category: "Web Development", avgRate: 55, count: 4 },
    ];
    expect(pickTopCategories(rows, 5)).toEqual(["Web Development", "Design"]);
  });

  it("caps at the given limit", () => {
    const rows: RateTrendRow[] = ["A", "B", "C"].map((category) => ({
      month: "2026-01",
      category,
      avgRate: 10,
      count: 1,
    }));
    expect(pickTopCategories(rows, 2)).toHaveLength(2);
  });
});

describe("buildMonthRange", () => {
  it("returns the requested number of months, oldest first, ending this month", () => {
    const months = buildMonthRange(3);
    expect(months).toHaveLength(3);
    const now = new Date();
    const expectedLast = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    expect(months[2]).toBe(expectedLast);
    // strictly increasing
    expect(months[0] < months[1]).toBe(true);
    expect(months[1] < months[2]).toBe(true);
  });
});

describe("formatMonthLabel", () => {
  it("formats YYYY-MM as an abbreviated month + 2-digit year", () => {
    expect(formatMonthLabel("2026-03")).toBe("Mar 26");
  });
});

describe("buildTrendSeries", () => {
  it("aligns rows to the month axis and fills gaps with null", () => {
    const rows: RateTrendRow[] = [{ month: "2026-02", category: "Design", avgRate: 42, count: 3 }];
    const series = buildTrendSeries(rows, ["2026-01", "2026-02", "2026-03"], ["Design"]);
    expect(series).toEqual([{ key: "Design", label: "Design", values: [null, 42, null] }]);
  });

  it("returns one series per requested category even with no matching rows", () => {
    const series = buildTrendSeries([], ["2026-01"], ["Design", "QA / Testing"]);
    expect(series.map((s) => s.key)).toEqual(["Design", "QA / Testing"]);
    expect(series.every((s) => s.values.every((v) => v === null))).toBe(true);
  });
});
