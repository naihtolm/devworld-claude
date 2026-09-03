"use client";

import { useTransition } from "react";
import { toggleFavorite } from "@/modules/favorites/actions";

export function FavoriteButton({
  targetType,
  targetId,
  path,
  initialFavorited,
}: {
  targetType: "developer_profile" | "project";
  targetId: string;
  path: string;
  initialFavorited: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => startTransition(() => toggleFavorite(targetType, targetId, path))}
    >
      <button
        type="submit"
        disabled={isPending}
        aria-pressed={initialFavorited}
        aria-label={initialFavorited ? "Remove from saved" : "Save"}
        className={`rounded-full border p-1.5 transition-colors ${
          initialFavorited
            ? "border-brand-200 bg-brand-50 text-brand-600"
            : "border-neutral-200 text-neutral-400 hover:text-brand-600"
        } disabled:opacity-50`}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill={initialFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
          <path d="M10 17.5s-6.5-4.2-8.5-8.2C.3 6.4 1.8 3 5 3c1.9 0 3.4 1 5 3 1.6-2 3.1-3 5-3 3.2 0 4.7 3.4 3.5 6.3-2 4-8.5 8.2-8.5 8.2z" />
        </svg>
      </button>
    </form>
  );
}
