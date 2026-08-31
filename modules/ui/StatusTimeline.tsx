const STEPS = ["Pending acceptance", "Active", "Completed"];

// The agreement lifecycle's happy path, visualized — disputed/cancelled are
// branch states off this track, not points on it, so they're shown as a
// separate banner on the agreement page rather than bent into the stepper.
function stepIndexFor(status: string) {
  if (status === "completed") return 2;
  if (status === "active" || status === "disputed") return 1;
  return 0;
}

export function StatusTimeline({ status }: { status: string }) {
  const currentIndex = stepIndexFor(status);
  const isDisputed = status === "disputed";
  const isCancelled = status === "cancelled";

  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const done = i < currentIndex || (i === currentIndex && status === "completed");
        const current = i === currentIndex && status !== "completed";
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  isCancelled
                    ? "bg-neutral-200 text-neutral-400"
                    : done
                      ? "bg-emerald-500 text-white"
                      : current
                        ? isDisputed
                          ? "bg-red-500 text-white"
                          : "bg-brand-600 text-white"
                        : "border-2 border-neutral-200 bg-white text-neutral-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={`text-xs ${current ? "font-medium text-neutral-700" : "text-neutral-400"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${i < currentIndex ? "bg-emerald-500" : "bg-neutral-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
