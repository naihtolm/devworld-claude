"use client";

import { useEffect } from "react";
import { useTour } from "./TourProvider";
import type { TourId } from "./tours";

// Invisible — fires once on mount to auto-start a tour the first time
// someone lands on this page (TourProvider checks localStorage and no-ops
// if it's already been seen or skipped).
export function TourAutoStart({ tourId }: { tourId: TourId }) {
  const { startTourIfUnseen } = useTour();
  useEffect(() => {
    startTourIfUnseen(tourId);
    // Intentionally only on mount — this fires once per page visit, not
    // every time the tour context identity happens to change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Manual replay — always restarts from step 1, regardless of whether it's
// been seen before.
export function TourReplayButton({ tourId, label = "Take the tour" }: { tourId: TourId; label?: string }) {
  const { startTour } = useTour();
  return (
    <button
      type="button"
      onClick={() => startTour(tourId)}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-neutral-500 underline hover:text-neutral-800"
    >
      <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-400 text-[10px]">
        ?
      </span>
      {label}
    </button>
  );
}
