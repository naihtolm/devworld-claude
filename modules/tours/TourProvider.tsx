"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { TOURS, type TourId } from "./tours";
import { computeSpotlightRect, computeBackdropPanels, computeTooltipPosition, type Rect } from "./tourGeometry";
import { Button } from "@/modules/ui/Button";

const TOOLTIP_SIZE = { width: 320, height: 168 };
const SEEN_KEY_PREFIX = "devworld:tour-seen:";

// Guards every localStorage call — a private window, cleared site data, or a
// storage-blocking browser setting can make it throw on read *or* write, and
// a tour is a nice-to-have, never something that should crash the page.
function hasSeenTour(tourId: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY_PREFIX + tourId) === "1";
  } catch {
    return false;
  }
}

function markTourSeen(tourId: string) {
  try {
    localStorage.setItem(SEEN_KEY_PREFIX + tourId, "1");
  } catch {
    // Best-effort — worst case the auto-start tour just replays next visit.
  }
}

type TourContextValue = {
  startTour: (tourId: TourId) => void;
  startTourIfUnseen: (tourId: TourId) => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const searchAttemptRef = useRef(0);

  const tour = activeTourId ? TOURS[activeTourId] : null;
  const step = tour?.steps[stepIndex] ?? null;

  const close = useCallback((markSeen: boolean) => {
    if (activeTourId && markSeen) markTourSeen(activeTourId);
    setActiveTourId(null);
    setStepIndex(0);
    setTargetRect(null);
  }, [activeTourId]);

  const startTour = useCallback((tourId: TourId) => {
    setActiveTourId(tourId);
    setStepIndex(0);
    setTargetRect(null);
  }, []);

  const startTourIfUnseen = useCallback((tourId: TourId) => {
    if (!hasSeenTour(tourId)) startTour(tourId);
  }, [startTour]);

  // Finds and measures the current step's target, retrying briefly (a form
  // field can mount a tick after the page itself, e.g. behind client-side
  // state) before giving up and skipping to the next step so the tour never
  // gets stuck pointing at nothing.
  useEffect(() => {
    if (!step) return;
    searchAttemptRef.current = 0;
    // Hide the overlay for the one frame between steps — otherwise it
    // briefly renders the new step's title/body at the *previous* step's
    // position until this effect's own measurement below catches up.
    setTargetRect(null);
    let cancelled = false;
    let frame: number;

    function measure() {
      // A window/webview can report innerHeight 0 for a frame or two while
      // it's still settling its own size (seen in embedded viewports) —
      // "fullyVisible" against a 0-height viewport is always false, which
      // forced a scrollIntoView(block:"center") to run against that
      // zero-height viewport and land somewhere wrong. Wait for a real
      // viewport instead of measuring against a bogus one.
      if (window.innerHeight === 0) {
        frame = requestAnimationFrame(measure);
        return;
      }

      const el = document.querySelector(`[data-tour="${step!.target}"]`);
      if (el) {
        // "smooth" scrolling is asynchronous — reading the rect right after
        // calling it (as this used to) captures the PRE-scroll position, so
        // the spotlight ends up floating over whatever field happened to be
        // there before the page moved. Scroll only when necessary, and only
        // ever measure after the scroll (instant, not animated) has already
        // applied.
        const initialRect = el.getBoundingClientRect();
        const fullyVisible = initialRect.top >= 0 && initialRect.bottom <= window.innerHeight;
        if (!fullyVisible) el.scrollIntoView({ behavior: "auto", block: "center" });
        const rect = el.getBoundingClientRect();
        if (!cancelled) setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
        return;
      }
      searchAttemptRef.current += 1;
      if (searchAttemptRef.current > 20) {
        // ~1s of retries at one attempt per frame — this step's target
        // genuinely isn't on the page (e.g. a conditional field), so move
        // on rather than showing a tooltip pointing at nothing.
        if (!cancelled) {
          if (tour && stepIndex + 1 < tour.steps.length) {
            setStepIndex(stepIndex + 1);
          } else {
            close(true);
          }
        }
        return;
      }
      frame = requestAnimationFrame(measure);
    }
    frame = requestAnimationFrame(measure);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, tour]);

  // Re-measure on resize/scroll while a tour is active — the spotlight and
  // tooltip both anchor to the target's live viewport position.
  useEffect(() => {
    if (!step) return;
    function reposition() {
      const el = document.querySelector(`[data-tour="${step!.target}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [step]);

  useEffect(() => {
    if (!tour) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close(true);
      else if (e.key === "ArrowRight") setStepIndex((i) => Math.min(i + 1, tour!.steps.length - 1));
      else if (e.key === "ArrowLeft") setStepIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tour, close]);

  const isLastStep = tour ? stepIndex === tour.steps.length - 1 : false;

  return (
    <TourContext.Provider value={{ startTour, startTourIfUnseen }}>
      {children}
      {tour && step && targetRect && (
        <TourOverlay
          step={step}
          stepNumber={stepIndex + 1}
          totalSteps={tour.steps.length}
          targetRect={targetRect}
          isLastStep={isLastStep}
          onBack={() => setStepIndex((i) => Math.max(i - 1, 0))}
          onNext={() => (isLastStep ? close(true) : setStepIndex((i) => i + 1))}
          onSkip={() => close(true)}
        />
      )}
    </TourContext.Provider>
  );
}

function TourOverlay({
  step,
  stepNumber,
  totalSteps,
  targetRect,
  isLastStep,
  onBack,
  onNext,
  onSkip,
}: {
  step: { title: string; body: string; placement?: "top" | "bottom" };
  stepNumber: number;
  totalSteps: number;
  targetRect: Rect;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let frame: number;
    function update() {
      // Same zero-size race as the target-measurement effect above — retry
      // rather than commit to a bogus 0×0 viewport.
      if (window.innerWidth === 0 || window.innerHeight === 0) {
        frame = requestAnimationFrame(update);
        return;
      }
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    update();
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (viewport.width === 0) return null;

  const spotlight = computeSpotlightRect(targetRect);
  const panels = computeBackdropPanels(spotlight, viewport);
  const { top, left, placement } = computeTooltipPosition(targetRect, viewport, TOOLTIP_SIZE, step.placement ?? "bottom");

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Guided tour">
      {/* Four opaque panels tile the viewport around the spotlight rect,
          dimming everything except the hole — see
          modules/tours/tourGeometry.ts's computeBackdropPanels for why this
          is four ordinary rects rather than one oversized box-shadow. These
          also capture every click on the page while the tour is active,
          since interacting with the real form mid-tour isn't the point —
          advancing is via Next/Back/Skip only. bg-black, not bg-neutral-900
          — the inverted dark scale makes neutral-900 near-white (same
          gotcha noted in MobileMenuSheet/ConfirmDialog). */}
      {panels.map((panel, i) => (
        <div key={i} className="absolute bg-black/70" style={panel} />
      ))}

      {/* The highlight ring around the hole itself — an ordinary small
          box-shadow, not the dimming mechanism. */}
      <div
        className="pointer-events-none absolute rounded-card transition-all duration-200"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
          boxShadow: "0 0 0 3px rgba(168,255,96,0.7), 0 0 12px rgba(168,255,96,0.5)",
        }}
      />

      <div
        className="absolute w-80 rounded-card border border-neutral-200 bg-white p-4 shadow-popover transition-all duration-200"
        style={{ top, left, width: TOOLTIP_SIZE.width }}
        data-placement={placement}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs text-neutral-500">
            step {stepNumber} / {totalSteps}
          </span>
          <button type="button" onClick={onSkip} className="text-xs text-neutral-500 underline hover:text-neutral-800">
            Skip tour
          </button>
        </div>
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">{step.title}</h3>
        <p className="mb-4 text-sm text-neutral-600">{step.body}</p>
        <div className="flex justify-end gap-2">
          {stepNumber > 1 && (
            <Button type="button" variant="secondary" size="sm" onClick={onBack}>
              Back
            </Button>
          )}
          <Button type="button" size="sm" onClick={onNext}>
            {isLastStep ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
