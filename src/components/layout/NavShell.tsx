"use client";

import { useState, type ReactNode } from "react";
import { MenuIcon, XIcon } from "lucide-animated";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { AccountNav } from "@/components/layout/AccountNav";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Wordmark } from "@/components/layout/Wordmark";

/** Navigation entry of the shell. */
export interface NavLinkItem {
  href: string;
  label: string;
}

/** Props accepted by the navigation shell. */
export interface NavShellProps {
  links: NavLinkItem[];
  tone?: "paper" | "pine";
  children?: ReactNode;
}

const TONE_CLASSES: Record<"paper" | "pine", string> = {
  paper: "border-line bg-surface text-ink",
  pine: "border-pine-deep bg-pine text-white",
};

/**
 * Renders the application navigation bar: brand, section links, language
 * selector and account area, collapsing into a menu below the tablet breakpoint.
 *
 * @param props - Section links, colour tone and optional extra actions.
 * @returns The rendered navigation bar.
 */
export function NavShell({ links, tone = "paper", children }: NavShellProps): ReactNode {
  const t = useTranslations("Nav");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className={cn("border-b", TONE_CLASSES[tone])}>
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="CoSpace" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t("primary")}>
          {links.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-[var(--radius-card)] px-3 py-2 text-[0.88rem] font-medium",
                  isActive ? "bg-current/10" : "hover:bg-current/5",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {children}
          <LocaleSwitcher />
          <AccountNav />
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="flex size-10 items-center justify-center rounded-[var(--radius-card)] border border-current/25 md:hidden"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? t("closeMenu") : t("openMenu")}
        >
          {isMenuOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
        </button>
      </div>

      {isMenuOpen ? (
        <div className={cn("border-t px-5 py-4 md:hidden", TONE_CLASSES[tone])}>
          <nav className="flex flex-col gap-1" aria-label={t("primary")}>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-[var(--radius-card)] px-3 py-2.5 text-[0.92rem] font-medium hover:bg-current/5"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center justify-between gap-4">
            <LocaleSwitcher />
            <AccountNav />
          </div>
        </div>
      ) : null}
    </header>
  );
}
