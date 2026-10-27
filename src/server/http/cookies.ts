import { AUTH_COOKIES } from "@/lib/domain/rules";

/** Options applied to every authentication cookie. */
export interface AuthCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
}

/** Cookie plus its options, ready to be written by any HTTP layer. */
export interface CookieDescriptor {
  name: string;
  value: string;
  options: AuthCookieOptions;
}

/** Token pair and lifetimes a session is built from. */
export interface SessionTokens {
  accessToken: string;
  accessTokenMaxAge: number;
  refreshToken: string;
  refreshTokenMaxAge: number;
}

/**
 * Builds the cookie descriptors of an authenticated session. Access and refresh
 * tokens are only ever transported in `httpOnly`, `secure`, `sameSite` cookies,
 * never in the response body nor in local storage.
 *
 * @param tokens - Token pair issued by the session service.
 * @param secure - Whether the cookies may only travel over HTTPS.
 * @returns One descriptor per authentication cookie.
 */
export function sessionCookieDescriptors(
  tokens: SessionTokens,
  secure: boolean,
): CookieDescriptor[] {
  return [
    {
      name: AUTH_COOKIES.accessToken,
      value: tokens.accessToken,
      options: {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: tokens.accessTokenMaxAge,
      },
    },
    {
      name: AUTH_COOKIES.refreshToken,
      value: tokens.refreshToken,
      options: {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: tokens.refreshTokenMaxAge,
      },
    },
  ];
}

/**
 * Builds the descriptors that expire the authentication cookies on logout.
 *
 * @param secure - Whether the cookies may only travel over HTTPS.
 * @returns One clearing descriptor per authentication cookie.
 */
export function clearedCookieDescriptors(secure: boolean): CookieDescriptor[] {
  return sessionCookieDescriptors(
    { accessToken: "", accessTokenMaxAge: 0, refreshToken: "", refreshTokenMaxAge: 0 },
    secure,
  );
}

/**
 * Decides whether cookies must carry the `secure` flag.
 *
 * @param appUrl - Public base URL the application is served from.
 * @returns True when the application is served over HTTPS.
 */
export function requiresSecureCookies(appUrl: string): boolean {
  return appUrl.startsWith("https://");
}
