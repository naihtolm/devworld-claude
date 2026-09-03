"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/modules/ui/Button";

// DW-951 — Next.js requires this to be a client component (it catches
// render errors client-side). Payment failures get their own honest copy
// where they happen (design language §07); this is the generic catch-all
// for everything else that shouldn't ever say "something went wrong" with
// no way forward.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="mb-2 font-mono text-sm text-neutral-400">Error</p>
      <h1 className="mb-3 text-h1">Something went wrong</h1>
      <p className="mb-8 text-neutral-600">
        That&rsquo;s on us, not you — try again, and if it keeps happening let us know what you were doing.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <LinkButton href="/" variant="secondary">
          Go home
        </LinkButton>
      </div>
    </main>
  );
}
