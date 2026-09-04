"use client";

import { useMemo, useState } from "react";
import { buildXScale, buildYScale, buildYTicks, buildLinePath } from "./chartScale";
import { formatMonthLabel, type RateTrendSeries } from "./rateTrendsShape";

// Validated categorical palette (dark mode, 5 slots) — see the dataviz
// skill's references/palette.md. Checked against this app's card surface
// (#111318) with scripts/validate_palette.js: all six checks pass. Fixed
// order, never cycled or reassigned per render.
const PALETTE = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];

const WIDTH = 720;
const HEIGHT = 320;
const PADDING = { top: 24, right: 20, bottom: 36, left: 48 };
const CARD_BG = "#111318"; // matches modules/ui/Card.tsx — for marker rings/tooltip bg

function formatRate(value: number) {
  return `$${Math.round(value)}/hr`;
}

// Nudges end-labels apart vertically when two series finish close together,
// rather than letting them overlap — see the dataviz skill's guidance on
// colliding direct labels.
function declutter(items: { key: string; y: number }[], minGap = 14) {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < minGap) {
      sorted[i].y = sorted[i - 1].y + minGap;
    }
  }
  return new Map(sorted.map((s) => [s.key, s.y]));
}

export function RateTrendsChart({ months, series }: { months: string[]; series: RateTrendSeries[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const xScale = useMemo(() => buildXScale(months.length, WIDTH, PADDING), [months.length]);
  const maxValue = useMemo(
    () => Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null))),
    [series]
  );
  const yScale = useMemo(() => buildYScale(maxValue, HEIGHT, PADDING), [maxValue]);
  const yTicks = useMemo(() => buildYTicks(maxValue, 4), [maxValue]);

  const paths = useMemo(
    () =>
      series.map((s, i) => ({
        key: s.key,
        label: s.label,
        color: PALETTE[i % PALETTE.length],
        d: buildLinePath(s.values, xScale, yScale),
      })),
    [series, xScale, yScale]
  );

  const endLabels = useMemo(() => {
    const raw = series.map((s, i) => {
      const lastIndex = [...s.values].map((v, idx) => (v !== null ? idx : -1)).filter((idx) => idx >= 0).pop();
      if (lastIndex === undefined) return null;
      const value = s.values[lastIndex]!;
      return { key: s.key, x: xScale(lastIndex), y: yScale(value), value, color: PALETTE[i % PALETTE.length] };
    });
    const present = raw.filter((r): r is NonNullable<typeof r> => r !== null);
    const declutteredY = declutter(present.map((p) => ({ key: p.key, y: p.y })));
    return present.map((p) => ({ ...p, y: declutteredY.get(p.key) ?? p.y }));
  }, [series, xScale, yScale]);

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const innerWidth = WIDTH - PADDING.left - PADDING.right;
    const ratio = (relX - PADDING.left) / innerWidth;
    const index = Math.round(ratio * (months.length - 1));
    setHoveredIndex(Math.min(months.length - 1, Math.max(0, index)));
  }

  if (series.length === 0) {
    return null;
  }

  const hovered = hoveredIndex !== null ? months[hoveredIndex] : null;
  const hoveredValues = hoveredIndex !== null ? series.map((s, i) => ({ label: s.label, value: s.values[hoveredIndex], color: PALETTE[i % PALETTE.length] })) : [];

  // Tooltip box, clamped so it never overflows the chart's right/left edge.
  const tooltipWidth = 168;
  const tooltipX = hoveredIndex !== null
    ? Math.min(Math.max(xScale(hoveredIndex) - tooltipWidth / 2, PADDING.left), WIDTH - PADDING.right - tooltipWidth)
    : 0;

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredIndex(null)}
        role="img"
        aria-label="Average hourly rate by category over time"
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#27272A"
              strokeWidth={1}
            />
            <text x={PADDING.left - 8} y={yScale(tick)} textAnchor="end" dominantBaseline="middle" className="fill-neutral-500" fontSize={10}>
              ${tick}
            </text>
          </g>
        ))}

        {months.map((m, i) => (
          <text
            key={m}
            x={xScale(i)}
            y={HEIGHT - PADDING.bottom + 18}
            textAnchor="middle"
            className="fill-neutral-500"
            fontSize={10}
          >
            {formatMonthLabel(m)}
          </text>
        ))}

        {hoveredIndex !== null && (
          <line
            x1={xScale(hoveredIndex)}
            x2={xScale(hoveredIndex)}
            y1={PADDING.top}
            y2={HEIGHT - PADDING.bottom}
            stroke="#3F3F46"
            strokeWidth={1}
          />
        )}

        {paths.map((p) => (
          <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {endLabels.map((l) => (
          <g key={l.key}>
            <circle cx={l.x} cy={yScale(l.value)} r={4} fill={l.color} stroke={CARD_BG} strokeWidth={2} />
            <text x={l.x + 8} y={l.y} dominantBaseline="middle" className="fill-neutral-600" fontSize={11} fontFamily="'JetBrains Mono', monospace">
              {formatRate(l.value)}
            </text>
          </g>
        ))}

        {hoveredIndex !== null && (
          <g transform={`translate(${tooltipX}, ${PADDING.top})`}>
            <rect width={tooltipWidth} height={20 + hoveredValues.length * 16} fill={CARD_BG} stroke="#27272A" rx={3} />
            <text x={8} y={16} className="fill-neutral-500" fontSize={10}>
              {hovered ? formatMonthLabel(hovered) : ""}
            </text>
            {hoveredValues.map((v, i) => (
              <g key={v.label} transform={`translate(8, ${30 + i * 16})`}>
                <line x1={0} y1={-4} x2={12} y2={-4} stroke={v.color} strokeWidth={2} />
                <text x={18} y={0} className="fill-neutral-500" fontSize={10}>
                  {v.label}
                </text>
                <text x={tooltipWidth - 16} y={0} textAnchor="end" className="fill-neutral-900" fontSize={10} fontWeight={600}>
                  {v.value === null ? "—" : formatRate(v.value)}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {paths.map((p) => (
          <li key={p.key} className="flex items-center gap-2 text-xs text-neutral-500">
            <span aria-hidden className="inline-block h-0.5 w-3" style={{ backgroundColor: p.color }} />
            {p.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
