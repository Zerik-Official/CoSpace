import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Props accepted by the brand mark. */
export interface WordmarkProps {
  className?: string;
}

/**
 * Renders the CoSpace wordmark. The glyph is a floor plan split into three zones
 * with one of them in use, which is what the product actually does.
 *
 * @param props - Extra classes applied to the wrapper.
 * @returns The rendered wordmark.
 */
export function Wordmark({ className }: WordmarkProps): ReactNode {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden focusable="false">
        <rect
          x="1.75"
          y="4.75"
          width="20.5"
          height="14.5"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M9 4.75v14.5M15 4.75v14.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2.5" y="5.5" width="6" height="13" rx="1" fill="currentColor" />
      </svg>
      <span className="font-display text-[1.15rem] font-semibold tracking-[-0.02em]">CoSpace</span>
    </span>
  );
}
