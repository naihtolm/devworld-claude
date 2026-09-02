// Shaped to match real content, never a bare spinner, for anything
// DB-driven — a card skeleton for list screens, a line skeleton for
// messages, an avatar skeleton for anywhere Avatar renders.
const pulse = "animate-pulse rounded-card bg-neutral-200";

function CardSkeleton() {
  return (
    <div className="rounded-card border border-neutral-200 bg-white p-4 shadow-card">
      <div className={`mb-3 h-4 w-2/3 ${pulse}`} />
      <div className={`mb-2 h-3 w-full ${pulse}`} />
      <div className={`h-3 w-4/5 ${pulse}`} />
    </div>
  );
}

function LineSkeleton() {
  return <div className={`h-3 w-full ${pulse}`} />;
}

function AvatarSkeleton() {
  return <div className={`h-8 w-8 rounded-full ${pulse.replace("rounded-card", "")}`} />;
}

const VARIANTS = { card: CardSkeleton, line: LineSkeleton, avatar: AvatarSkeleton };

export function Skeleton({
  variant,
  count = 1,
}: {
  variant: keyof typeof VARIANTS;
  count?: number;
}) {
  const Item = VARIANTS[variant];
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }, (_, i) => (
        <Item key={i} />
      ))}
    </div>
  );
}
