import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Visual weight of a button. */
export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

/** Height and padding scale of a button. */
export type ButtonSize = "md" | "sm";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border-pine bg-pine text-white hover:bg-pine-deep hover:border-pine-deep",
  secondary: "border-line bg-surface text-ink hover:border-line-strong hover:bg-paper",
  quiet: "border-transparent bg-transparent text-pine hover:bg-pine-soft",
  danger: "border-ochre bg-surface text-ochre hover:bg-ochre-soft",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "h-11 gap-2.5 px-5 text-[0.95rem]",
  sm: "h-9 gap-2 px-3.5 text-[0.85rem]",
};

/** Props accepted by every button of the interface. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

/**
 * Renders a button. The component stays free of hooks so it can be used from
 * both server and client components.
 *
 * @param props - Variant, size and native button attributes.
 * @returns The rendered button element.
 */
export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps): ReactNode {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-card)] border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
