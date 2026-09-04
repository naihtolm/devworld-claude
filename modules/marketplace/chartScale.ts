// Pure geometry math for the rate-trends line chart, kept separate from the
// chart component so it's testable without pulling in JSX/React — same
// reasoning as modules/ui/statusClassify.ts.

export function buildYScale(
  maxValue: number,
  height: number,
  padding: { top: number; bottom: number }
): (value: number) => number {
  const innerHeight = Math.max(height - padding.top - padding.bottom, 1);
  const max = Math.max(maxValue, 1);
  return (value: number) => padding.top + innerHeight - (value / max) * innerHeight;
}

export function buildXScale(
  pointCount: number,
  width: number,
  padding: { left: number; right: number }
): (index: number) => number {
  const innerWidth = Math.max(width - padding.left - padding.right, 1);
  if (pointCount <= 1) return () => padding.left + innerWidth / 2;
  return (index: number) => padding.left + (index / (pointCount - 1)) * innerWidth;
}

// Rounds up to a "clean" step (multiple of 5/10/25/50/100...) so axis
// labels read as round numbers rather than the raw data max.
export function niceStep(maxValue: number, tickCount = 4): number {
  if (maxValue <= 0) return 1;
  const roughStep = maxValue / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

export function buildYTicks(maxValue: number, tickCount = 4): number[] {
  if (maxValue <= 0) return [0];
  const step = niceStep(maxValue, tickCount);
  const ticks: number[] = [];
  for (let v = 0; v <= maxValue + step; v += step) ticks.push(v);
  return ticks;
}

// Builds an SVG path string for a series that may contain gaps (null =
// no data that month) — breaks into separate "M" segments around gaps
// rather than drawing a misleading line straight through them.
export function buildLinePath(values: (number | null)[], xScale: (i: number) => number, yScale: (v: number) => number): string {
  const segments: string[] = [];
  let drawing = false;
  values.forEach((v, i) => {
    if (v === null) {
      drawing = false;
      return;
    }
    const x = xScale(i);
    const y = yScale(v);
    segments.push(`${drawing ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`);
    drawing = true;
  });
  return segments.join(" ");
}
