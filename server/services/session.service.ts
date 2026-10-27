import type { PrismaClient, User } from "@/server/db/generated/client";

import type { SessionUser } from "@/lib/domain/types";
import { Logger, LogTag } from "@/server/logger";
import {
  clearedCookieDescriptors,
  sessionCookieDescriptors,
  type CookieDescriptor,
  type SessionTokens,
} from "@/server/http/cookies";
import type { TokenService } from "@/server/security/token-service";
import { toSessionUser } from "@/server/services/mappers";

/** Session resolved for an incoming request. */
export interface SessionSnapshot {
  user: SessionUser | null;
  renewedCookies: CookieDescriptor[];
}

/** Session created after a successful registration, login or rotation. */
export interface IssuedSession {
  user: SessionUser;
  cookies: CookieDescriptor[];
}

/**
 * Owns the lifecycle of an authenticated session: issuing the access and refresh
 * tokens, rotating the refresh token without asking the user to sign in again,
 * and revoking it on logout. Tokens only travel inside `httpOnly` cookies.
 */
export class SessionService {
  /**
   * @param prisma - Prisma client used by the refresh token store.
   * @param tokens - Token service that signs and hashes the credentials.
   * @param secureCookies - Whether cookies are restricted to HTTPS.
   */
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tokens: TokenService,
    private readonly secureCookies: boolean,
  ) {}

  /**
   * Opens a brand new session for a user.
   *
   * @param user - Authenticated user row.
   * @returns The session principal together with its cookie descriptors.
   */
  async start(user: User): Promise<IssuedSession> {
    const issued = await this.issueTokens(user);

    return { user: toSessionUser(user), cookies: issued.cookies };
  }

  /**
   * Resolves the session of an incoming request. A valid access token is used as
   * is; an expired access token with a live refresh token is rotated in place so
   * the user never has to sign in again.
   *
   * @param accessToken - Access token cookie received from the client.
   * @param refreshToken - Refresh token cookie received from the client.
   * @returns The resolved principal and any cookie that must be rewritten.
   */
  async resolve(accessToken?: string, refreshToken?: string): Promise<SessionSnapshot> {
    const claims = await this.tokens.verifyAccessToken(accessToken);
    if (claims) {
      const user = await this.prisma.user.findUnique({ where: { id: claims.subject } });
      if (user) {
        return { user: toSessionUser(user), renewedCookies: [] };
      }
    }

    if (!refreshToken) {
      return { user: null, renewedCookies: [] };
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.tokens.hashRefreshToken(refreshToken) },
    });

    if (!stored || stored.revokedAt !== null || stored.expiresAt.getTime() <= Date.now()) {
      return { user: null, renewedCookies: clearedCookieDescriptors(this.secureCookies) };
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      return { user: null, renewedCookies: clearedCookieDescriptors(this.secureCookies) };
    }

    const rotated = await this.rotate(stored.id, user);

    return { user: rotated.user, renewedCookies: rotated.cookies };
  }

  /**
   * Revokes the refresh token of a session and expires its cookies.
   *
   * @param refreshToken - Refresh token cookie received from the client.
   * @returns Cookie descriptors that clear the session on the client.
   */
  async end(refreshToken?: string): Promise<CookieDescriptor[]> {
    if (refreshToken) {
      const tokenHash = this.tokens.hashRefreshToken(refreshToken);
      const result = await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      Logger.log("INFO", LogTag.AUTH, "Refresh token revoked on logout", {
        revoked: result.count,
      });
    }

    return clearedCookieDescriptors(this.secureCookies);
  }

  /**
   * Signs a fresh access token and persists a new refresh token digest.
   *
   * @param user - Authenticated user row.
   * @returns The token pair together with its cookie descriptors.
   */
  private async issueTokens(
    user: User,
  ): Promise<{ tokens: SessionTokens; cookies: CookieDescriptor[] }> {
    const accessToken = await this.tokens.issueAccessToken({
      subject: user.id,
      email: user.email,
      role: user.role,
    });
    const refresh = this.tokens.issueRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refresh.tokenHash,
        expiresAt: this.tokens.refreshExpiry(),
      },
    });

    const tokens: SessionTokens = {
      accessToken,
      accessTokenMaxAge: this.tokens.accessLifetimeSeconds,
      refreshToken: refresh.token,
      refreshTokenMaxAge: this.tokens.refreshLifetimeSeconds,
    };

    return { tokens, cookies: sessionCookieDescriptors(tokens, this.secureCookies) };
  }

  /**
   * Revokes a stored refresh token and issues a replacement, so a stolen token
   * can only be used once.
   *
   * @param storedTokenId - Identifier of the refresh token being replaced.
   * @param user - Owner of the session.
   * @returns The rotated session.
   */
  private async rotate(storedTokenId: string, user: User): Promise<IssuedSession> {
    await this.prisma.refreshToken.update({
      where: { id: storedTokenId },
      data: { revokedAt: new Date() },
    });

    const issued = await this.issueTokens(user);
    Logger.log("INFO", LogTag.AUTH, "Access token rotated from refresh token", {
      userId: user.id,
    });

    return { user: toSessionUser(user), cookies: issued.cookies };
  }
}
