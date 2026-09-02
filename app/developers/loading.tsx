import { Skeleton } from "@/modules/ui/Skeleton";

// Same reasoning as /projects — this route in particular does a real
// per-row fan-out (Clerk display + trust signal + skills, per developer),
// so it's one of the slower list pages to render.
export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-6 text-h1">Browse Developers</h1>
      <div className="mb-8 h-24 animate-pulse rounded-card border border-neutral-200 bg-neutral-100" />
      <Skeleton variant="card" count={5} />
    </main>
  );
}
