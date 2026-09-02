// Unread bubble for messages/notifications — distinct from StatusBadge,
// which is the colored word-pill for entity status (funded, declined, etc).
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span
      className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium leading-none text-white"
      aria-label={`${count} unread`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
