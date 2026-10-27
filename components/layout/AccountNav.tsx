"use client";

import type { ReactNode } from "react";
import { LuChevronDown, LuLayoutDashboard, LuLogOut, LuSettings } from "react-icons/lu";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { UserRole } from "@/lib/domain/enums";
import { useSession } from "@/components/session/SessionProvider";
import { cn } from "@/lib/utils/cn";

/**
 * Derives the initials shown in the account chip.
 *
 * @param fullName - Display name of the user.
 * @returns Up to two uppercase initials.
 */
function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Renders the account area of the navigation bar: the sign in actions for an
 * anonymous visitor, or the user menu of an authenticated one.
 *
 * @returns The rendered account area.
 */
export function AccountNav(): ReactNode {
  const { user, isResolving, logout } = useSession();
  const t = useTranslations("Nav");
  const router = useRouter();

  if (isResolving) {
    return <span className="h-9 w-28 animate-pulse rounded-[var(--radius-card)] bg-current/10" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-[var(--radius-card)] border border-current/30 px-3.5 py-2 text-[0.85rem] font-medium hover:opacity-80"
        >
          {t("login")}
        </Link>
        <Link
          href="/register"
          className="rounded-[var(--radius-card)] border border-pine bg-pine px-3.5 py-2 text-[0.85rem] font-medium text-white hover:bg-pine-deep"
        >
          {t("register")}
        </Link>
      </div>
    );
  }

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.replace("/");
  };

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-[var(--radius-card)] border border-current/25 px-2.5 py-1.5 text-[0.85rem] hover:opacity-85">
        <span className="flex size-7 items-center justify-center rounded-full bg-pine text-[0.7rem] font-semibold text-white">
          {initialsOf(user.fullName)}
        </span>
        <span className="max-w-[9rem] truncate font-medium">{user.fullName}</span>
        <LuChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="absolute right-0 z-30 mt-2 flex w-56 flex-col rounded-[var(--radius-card)] border border-line bg-surface p-1.5 text-ink shadow-[0_10px_30px_-18px_rgba(19,28,24,0.5)]">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-[0.85rem] hover:bg-paper"
        >
          <LuLayoutDashboard className="size-4 text-pine" aria-hidden />
          {t("dashboard")}
        </Link>
        {user.role === UserRole.ADMIN ? (
          <Link
            href="/admin"
            className="flex items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-[0.85rem] hover:bg-paper"
          >
            <LuSettings className="size-4 text-pine" aria-hidden />
            {t("admin")}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => void handleLogout()}
          className={cn(
            "flex items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-left text-[0.85rem] hover:bg-paper",
          )}
        >
          <LuLogOut className="size-4 text-ochre" aria-hidden />
          {t("logout")}
        </button>
      </div>
    </details>
  );
}
