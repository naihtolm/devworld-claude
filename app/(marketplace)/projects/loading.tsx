import { Skeleton } from "@/modules/ui/Skeleton";

// Design language §11: a slow navigation shows the shape of what's coming
// rather than a blank screen or a generic spinner — no page-transition
// animation to compensate for it, this is the compensation.
export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-6 text-h1">Browse Projects</h1>
      <div className="mb-8 h-32 animate-pulse rounded-card border border-neutral-200 bg-neutral-100" />
      <Skeleton variant="card" count={4} />
    </main>
  );
}
