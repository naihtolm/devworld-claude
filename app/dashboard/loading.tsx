import { Skeleton } from "@/modules/ui/Skeleton";

// Covers both the client and developer dashboard — their shape (stat row
// + list) is close enough that one skeleton serves both without knowing
// yet which one will actually render.
export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 h-8 w-40 animate-pulse rounded-card bg-neutral-200" />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-card border border-neutral-200 bg-neutral-100" />
        ))}
      </div>
      <Skeleton variant="card" count={3} />
    </main>
  );
}
