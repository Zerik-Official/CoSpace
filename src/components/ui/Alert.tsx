import type { ReactNode } from "react";
import { LuCircleAlert, LuCircleCheck, LuInfo } from "react-icons/lu";

import { cn } from "@/lib/utils/cn";

/** Tone of an inline message. */
export type AlertTone = "error" | "success" | "info";

const TONE_CLASSES: Record<AlertTone, string> = {
  error: "border-ochre bg-ochre-soft text-ink",
  success: "border-pine bg-pine-soft text-ink",
  info: "border-line bg-surface text-ink",
};

const TONE_ICONS: Record<AlertTone, ReactNode> = {
  error: <LuCircleAlert className="mt-0.5 size-4 shrink-0 text-ochre" aria-hidden />,
  success: <LuCircleCheck className="mt-0.5 size-4 shrink-0 text-pine" aria-hidden />,
  info: <LuInfo className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden />,
};

/** Props accepted by an inline alert. */
export interface AlertProps {
  tone: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Renders an inline message. Errors state what failed and what to do about it,
 * never a raw internal string.
 *
 * @param props - Tone, optional title and the message body.
 * @returns The rendered alert.
 */
export function Alert({ tone, title, children, className }: AlertProps): ReactNode {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-2.5 rounded-[var(--radius-card)] border px-3.5 py-3 text-[0.88rem]",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {TONE_ICONS[tone]}
      <div className="flex flex-col gap-1">
        {title ? <p className="font-medium">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
