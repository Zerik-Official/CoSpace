import { createHmac, randomBytes } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

import type { UserRole } from "@/lib/domain/enums";
import type { AppConfig } from "@/server/config";

/** Claims carried by the signed access token. */
export interface AccessTokenClaims {
  subject: string;
  email: string;
  role: UserRole;
}

/** Opaque refresh token together with the material stored in the database. */
export interface RefreshTokenMaterial {
  token: string;
  tokenHash: string;
}

const ACCESS_TOKEN_ALGORITHM = "HS256";
const ACCESS_TOKEN_ISSUER = "cospace";
const REFRESH_TOKEN_BYTES = 32;

/**
 * Issues and verifies authentication tokens. Access tokens are short lived
 * HS256 JWTs; refresh tokens are opaque random strings that are only ever
 * persisted as an HMAC-SHA256 digest, so the database alone cannot replay them.
 */
export class TokenService {
  private readonly accessSecret: Uint8Array;

  /**
   * @param accessSecret - HS256 secret signing the access tokens.
   * @param refreshSecret - Secret used to derive the refresh token digest.
   * @param accessTtlSeconds - Access token lifetime in seconds.
   * @param refreshTtlSeconds - Refresh token lifetime in seconds.
   */
  constructor(
    accessSecret: string,
    private readonly refreshSecret: string,
    private readonly accessTtlSeconds: number,
    private readonly refreshTtlSeconds: number,
  ) {
    this.accessSecret = new TextEncoder().encode(accessSecret);
  }

  /**
   * Builds the service from the validated application configuration.
   *
   * @param config - Application configuration.
   * @returns A configured token service.
   */
  static fromConfig(config: AppConfig): TokenService {
    return new TokenService(
      config.jwtAccessSecret,
      config.jwtRefreshSecret,
      config.accessTokenTtlSeconds,
      config.refreshTokenTtlSeconds,
    );
  }

  /** Refresh token lifetime expressed in seconds. */
  get refreshLifetimeSeconds(): number {
    return this.refreshTtlSeconds;
  }

  /** Access token lifetime expressed in seconds. */
  get accessLifetimeSeconds(): number {
    return this.accessTtlSeconds;
  }

  /**
   * Signs an access token for the given principal.
   *
   * @param claims - Principal the token is issued for.
   * @returns The serialized JWT.
   */
  async issueAccessToken(claims: AccessTokenClaims): Promise<string> {
    return new SignJWT({ email: claims.email, role: claims.role })
      .setProtectedHeader({ alg: ACCESS_TOKEN_ALGORITHM })
      .setSubject(claims.subject)
      .setIssuer(ACCESS_TOKEN_ISSUER)
      .setIssuedAt()
      .setExpirationTime(`${this.accessTtlSeconds}s`)
      .sign(this.accessSecret);
  }

  /**
   * Verifies an access token, returning null instead of throwing on failure.
   *
   * @param token - Serialized JWT read from the request cookies.
   * @returns The claims, or null when the token is missing, expired or forged.
   */
  async verifyAccessToken(token: string | undefined): Promise<AccessTokenClaims | null> {
    if (!token) {
      return null;
    }

    try {
      const { payload } = await jwtVerify(token, this.accessSecret, {
        issuer: ACCESS_TOKEN_ISSUER,
        algorithms: [ACCESS_TOKEN_ALGORITHM],
      });

      if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
        return null;
      }

      return {
        subject: payload.sub,
        email: payload.email,
        role: payload.role as UserRole,
      };
    } catch {
      return null;
    }
  }

  /**
   * Creates a new opaque refresh token and the digest stored in the database.
   *
   * @returns The plain token handed to the client and its stored digest.
   */
  issueRefreshToken(): RefreshTokenMaterial {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");

    return { token, tokenHash: this.hashRefreshToken(token) };
  }

  /**
   * Derives the lookup digest of a refresh token.
   *
   * @param token - Plain refresh token received from the client.
   * @returns Hex encoded HMAC-SHA256 digest.
   */
  hashRefreshToken(token: string): string {
    return createHmac("sha256", this.refreshSecret).update(token).digest("hex");
  }

  /**
   * Computes the expiry instant of a refresh token issued now.
   *
   * @param now - Instant the token is issued at.
   * @returns Instant the refresh token stops being valid.
   */
  refreshExpiry(now: Date = new Date()): Date {
    return new Date(now.getTime() + this.refreshTtlSeconds * 1000);
  }
}
