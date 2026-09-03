import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";

// `danger` uses literal dark-adapted red values rather than Tailwind's
// built-in `red-*` scale — that scale isn't overridden by the Terminal
// theme (only neutral/white/brand are), so `red-50`/`red-600` would still
// render as pale light-mode values and look washed out on a near-black
// page. Matches modules/ui/DesignSystem's approved dark red pair.
const VARIANTS = {
  primary: "bg-brand-600 text-white font-mono hover:shadow-glow active:scale-[0.99] disabled:opacity-40",
  secondary: "border border-neutral-300 text-neutral-900 hover:border-brand-600 disabled:opacity-50",
  ghost: "text-neutral-500 underline hover:text-neutral-700 disabled:opacity-50",
  danger:
    "border border-[rgba(248,113,113,0.4)] text-[#F87171] hover:bg-[rgba(248,113,113,0.08)] disabled:opacity-50",
} as const;

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
} as const;

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

// focus-visible ring here, once, rather than per call site — this was
// missing on every interactive element in the app (design language §06).
// `active:scale` only on `primary`: that's the one variant attached to
// real commits (submit, publish, pay) — a press state on every button
// everywhere would just be noise. `rounded-card` (3px, sharp) not
// `rounded-md` — no soft corners anywhere in the Terminal direction.
const base =
  "inline-flex items-center justify-center rounded-card font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...props} />
  );
}

// Same visual language as Button, for plain navigational links (not inside
// a <form action>).
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {children}
    </Link>
  );
}
