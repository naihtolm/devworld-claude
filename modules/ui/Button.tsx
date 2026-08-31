import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";

const VARIANTS = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300",
  secondary: "border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50",
  ghost: "text-neutral-500 underline hover:text-neutral-700 disabled:opacity-50",
  danger: "border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50",
} as const;

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
} as const;

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors";

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
