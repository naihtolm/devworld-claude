import type { HTMLAttributes } from "react";
import Link from "next/link";

const base = "rounded-card border border-neutral-200 bg-white p-4 shadow-card transition-shadow";
const interactive = "hover:shadow-popover";

// The pattern this replaces (`rounded-lg border border-neutral-200 bg-white
// p-4 shadow-sm`) was copy-pasted inline on every list screen — one place
// to change it now.
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${base} ${className}`} {...props} />;
}

// Same visual language, for a card that's really a navigational link
// (project/proposal/developer list rows) — gets the hover-shadow lift the
// plain Card doesn't need.
export function LinkCard({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`block ${base} ${interactive} ${className}`}>
      {children}
    </Link>
  );
}
