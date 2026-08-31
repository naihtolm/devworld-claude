import Image from "next/image";

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

export function Avatar({
  name,
  imageUrl,
  size = "md",
}: {
  name: string | null;
  imageUrl: string | null;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const sizeClass = SIZE_CLASSES[size];
  const dimension = size === "sm" ? 24 : size === "lg" ? 56 : 36;

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name ?? "User"}
        width={dimension}
        height={dimension}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    );
  }

  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-neutral-200 font-medium text-neutral-600`}
    >
      {initial}
    </span>
  );
}
