import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Tone of a badge. */
export type BadgeTone = "neutral" | "pine" | "ochre";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface text-ink-soft",
  pine: "border-pine bg-pine-soft text-pine",
  ochre: "border-ochre bg-ochre-soft text-ochre",
};

/** Props accepted by a badge. */
export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

/**
 * Renders a compact label that encodes a state, a type or a capacity.
 *
 * @param props - Tone and label content.
 * @returns The rendered badge.
 */
export function Badge({ tone = "neutral", className, children }: BadgeProps): ReactNode {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.75rem] font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
