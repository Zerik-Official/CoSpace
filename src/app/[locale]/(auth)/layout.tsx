import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Wordmark } from "@/components/layout/Wordmark";

/**
 * Renders the authentication shell: a narrow centered panel with the brand and
 * the language selector, deliberately simpler than the public shell.
 *
 * @param props - Content of the matched authentication route.
 * @returns The rendered authentication layout.
 */
export default function AuthLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4 sm:px-8">
        <Link href="/" aria-label="CoSpace" className="text-ink">
          <Wordmark />
        </Link>
        <LocaleSwitcher />
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="reveal w-full max-w-[27rem] rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
