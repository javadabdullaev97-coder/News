import Link from "next/link";
import { getRubric } from "@/lib/data";

type Size = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<Size, string> = {
  sm: "text-[11px] tracking-tight",
  md: "text-base tracking-tight",
  lg: "text-2xl md:text-3xl tracking-tight",
  xl: "text-3xl md:text-5xl tracking-tight",
};

export function LeapTag({
  rubricSlug,
  size = "md",
  href,
  className = "",
}: {
  rubricSlug: string;
  size?: Size;
  href?: string;
  className?: string;
}) {
  const rubric = getRubric(rubricSlug);
  if (!rubric) return null;

  const content = (
    <span
      className={`inline-flex items-baseline font-mono font-medium lowercase ${sizeClasses[size]} ${className}`}
    >
      <span className="text-neutral-900 dark:text-neutral-100">leap</span>
      <span className="mx-[2px] text-neutral-400">·</span>
      <span className={rubric.textColor}>{rubric.slug}</span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group inline-flex items-baseline transition-opacity hover:opacity-80"
      >
        {content}
      </Link>
    );
  }
  return content;
}
