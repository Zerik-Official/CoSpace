import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { UserRole } from "@/lib/domain/enums";
import { AUTH_COOKIES } from "@/lib/domain/rules";
import { application } from "@/server/container";

const handleI18nRouting = createMiddleware(routing);

interface ProtectedSection {
  prefix: string;
  requiresAdministrator: boolean;
}

const PROTECTED_SECTIONS: readonly ProtectedSection[] = [
  { prefix: "/admin", requiresAdministrator: true },
  { prefix: "/dashboard", requiresAdministrator: false },
];

/**
 * Splits the locale prefix away from the rest of a pathname.
 *
 * @param pathname - Pathname received by the proxy.
 * @returns The active locale and the path without its prefix.
 */
function splitLocale(pathname: string): { locale: string; path: string } {
  const segments = pathname.split("/").filter(Boolean);
  const [first, ...rest] = segments;

  if (first && (routing.locales as readonly string[]).includes(first)) {
    return { locale: first, path: `/${rest.join("/")}` };
  }

  return { locale: routing.defaultLocale, path: pathname };
}

/**
 * Finds the protected section a path belongs to.
 *
 * @param path - Pathname without its locale prefix.
 * @returns The matching section, or null for public paths.
 */
function protectedSectionFor(path: string): ProtectedSection | null {
  return (
    PROTECTED_SECTIONS.find(
      (section) => path === section.prefix || path.startsWith(`${section.prefix}/`),
    ) ?? null
  );
}

/**
 * Guards the private and administrator sections and applies locale routing. A
 * visitor without a session is sent to the login page with the original
 * destination, and an expired access token is silently renewed from the refresh
 * token so nobody is signed out mid-session.
 *
 * @param request - Incoming request.
 * @returns The response to serve, either a redirect or the locale aware route.
 */
export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const { locale, path } = splitLocale(request.nextUrl.pathname);
  const section = protectedSectionFor(path);

  if (!section) {
    return handleI18nRouting(request);
  }

  const { sessions } = application();
  const snapshot = await sessions.resolve(
    request.cookies.get(AUTH_COOKIES.accessToken)?.value,
    request.cookies.get(AUTH_COOKIES.refreshToken)?.value,
  );

  if (!snapshot.user) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (section.requiresAdministrator && snapshot.user.role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  const response = handleI18nRouting(request);
  for (const cookie of snapshot.renewedCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
