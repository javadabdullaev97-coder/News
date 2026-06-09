import Image from "next/image";
import { flagUrl } from "@/lib/wc2026";

export function Flag({
  code,
  size = 24,
  className = "",
}: {
  code: string;
  size?: number;
  className?: string;
}) {
  if (!code || code === "_tbd") {
    return (
      <span
        aria-hidden
        className={`grid shrink-0 place-items-center rounded-full bg-neutral-200 text-[8px] font-bold uppercase text-neutral-500 dark:bg-neutral-800 ${className}`}
        style={{ width: size, height: size }}
      >
        ?
      </span>
    );
  }
  const src = flagUrl(code, 80);
  return (
    <span
      className={`relative shrink-0 overflow-hidden rounded-full ring-1 ring-neutral-200 dark:ring-neutral-800 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
    </span>
  );
}
