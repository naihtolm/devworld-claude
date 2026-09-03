import { LinkButton } from "@/modules/ui/Button";

// DW-950 — was just whatever Next.js defaults to. A deliberate,
// on-brand page for a real user-facing moment, not an afterthought.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="mb-2 font-mono text-sm text-neutral-400">404</p>
      <h1 className="mb-3 text-h1">Page not found</h1>
      <p className="mb-8 text-neutral-600">
        The page you&rsquo;re looking for doesn&rsquo;t exist, or may have moved.
      </p>
      <div className="flex gap-3">
        <LinkButton href="/">Go home</LinkButton>
        <LinkButton href="/projects" variant="secondary">
          Browse projects
        </LinkButton>
      </div>
    </main>
  );
}
