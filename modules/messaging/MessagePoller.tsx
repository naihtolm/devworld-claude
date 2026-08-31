"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// V1 messaging per modules/messaging/README.md: simple polling, no
// dedicated WebSocket service needed at this scale.
export function MessagePoller({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
