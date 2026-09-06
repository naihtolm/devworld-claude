// Pure geometry for the guided-tour overlay (modules/tours/TourProvider.tsx)
// — kept separate from the DOM/React code so the placement math is testable
// without a browser, same reasoning as modules/marketplace/chartScale.ts.

export type Rect = { top: number; left: number; width: number; height: number };
export type Placement = "top" | "bottom";

const GAP = 12; // px between the spotlighted target and the tooltip
const VIEWPORT_MARGIN = 12; // px the tooltip must stay clear of the viewport edge

// Picks which side of the target the tooltip sits on (falls back to
// whichever side has more room if the preferred side doesn't fit), then
// centers it horizontally on the target, clamped inside the viewport.
export function computeTooltipPosition(
  target: Rect,
  viewport: { width: number; height: number },
  tooltip: { width: number; height: number },
  preferred: Placement = "bottom"
): { top: number; left: number; placement: Placement } {
  const spaceBelow = viewport.height - (target.top + target.height);
  const spaceAbove = target.top;
  const fitsBelow = spaceBelow >= tooltip.height + GAP;
  const fitsAbove = spaceAbove >= tooltip.height + GAP;

  let placement: Placement;
  if (preferred === "bottom") {
    placement = fitsBelow || spaceBelow >= spaceAbove ? "bottom" : "top";
  } else {
    placement = fitsAbove || spaceAbove >= spaceBelow ? "top" : "bottom";
  }

  const rawTop = placement === "bottom" ? target.top + target.height + GAP : target.top - tooltip.height - GAP;
  const top = clamp(rawTop, VIEWPORT_MARGIN, viewport.height - tooltip.height - VIEWPORT_MARGIN);

  const rawLeft = target.left + target.width / 2 - tooltip.width / 2;
  const left = clamp(rawLeft, VIEWPORT_MARGIN, viewport.width - tooltip.width - VIEWPORT_MARGIN);

  return { top, left, placement };
}

function clamp(value: number, min: number, max: number): number {
  // A tooltip wider/taller than the viewport itself has no valid clamp
  // range (min > max) — pin to the smaller edge rather than let it drift
  // off-screen in that degenerate case.
  return max < min ? min : Math.min(Math.max(value, min), max);
}

// The spotlight "hole": the target rect plus a little padding, left
// uncovered by the four dimming panels below.
export function computeSpotlightRect(target: Rect, padding = 6): Rect {
  return {
    top: target.top - padding,
    left: target.left - padding,
    width: target.width + padding * 2,
    height: target.height + padding * 2,
  };
}

// Four opaque panels that tile the viewport around the spotlight rect,
// dimming everything except the hole. Deliberately not a single box-shadow
// with an oversized spread (e.g. "0 0 0 9999px") — that value is unusually
// large and was unreliable to paint/capture correctly in testing; four
// ordinary bounded rects are the conventional, robust way to draw this.
// Clamped so a spotlight that's partially (or fully) off-screen — the
// target hasn't scrolled fully into view yet — never produces a
// negative-size panel.
export function computeBackdropPanels(spotlight: Rect, viewport: { width: number; height: number }): Rect[] {
  const top = clamp(spotlight.top, 0, viewport.height);
  const bottom = clamp(spotlight.top + spotlight.height, 0, viewport.height);
  const left = clamp(spotlight.left, 0, viewport.width);
  const right = clamp(spotlight.left + spotlight.width, 0, viewport.width);

  return [
    { top: 0, left: 0, width: viewport.width, height: top }, // above
    { top: bottom, left: 0, width: viewport.width, height: viewport.height - bottom }, // below
    { top, left: 0, width: left, height: bottom - top }, // left of the hole
    { top, left: right, width: viewport.width - right, height: bottom - top }, // right of the hole
  ];
}
