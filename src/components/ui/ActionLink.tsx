import type { ComponentProps, ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import type { ButtonSize, ButtonVariant } from "@/components/ui/Button";

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

/** Props accepted by a locale aware link styled as a button. */
export interface ActionLinkProps extends Omit<ComponentProps<typeof Link>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

/**
 * Renders a locale aware link that looks like a button, so navigation keeps the
 * current language.
 *
 * @param props - Target href, variant, size and link attributes.
 * @returns The rendered anchor element.
 */
export function ActionLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ActionLinkProps): ReactNode {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-card)] border font-medium transition-colors",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
