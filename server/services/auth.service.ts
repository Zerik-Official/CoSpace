import type { PrismaClient, User } from "@/server/db/generated/client";

import { UserRole } from "@/lib/domain/enums";
import { isUniqueConstraintError } from "@/server/db/errors";
import { AppError, ErrorCode } from "@/server/errors";
import type { RateLimiter } from "@/server/http/rate-limiter";
import { Logger, LogTag } from "@/server/logger";
import type { PasswordHasher } from "@/server/security/password-hasher";
import type { IssuedSession, SessionService } from "@/server/services/session.service";
import type { LoginPayload, RegisterPayload } from "@/server/validation/schemas";

/**
 * Registration and login of the users of the platform. The administrator role is
 * never assigned here: it can only be created by the database seed.
 */
export class AuthService {
  /**
   * @param prisma - Prisma client used to read and write users.
   * @param passwords - Password hasher.
   * @param sessions - Session service that opens the authenticated session.
   * @param loginLimiter - Rate limiter throttling credential stuffing attempts.
   */
  constructor(
    private readonly prisma: PrismaClient,
    private readonly passwords: PasswordHasher,
    private readonly sessions: SessionService,
    private readonly loginLimiter: RateLimiter,
  ) {}

  /**
   * Creates a regular user account and opens a session for it.
   *
   * @param payload - Validated registration payload.
   * @returns The opened session of the new user.
   * @throws AppError with code EMAIL_ALREADY_REGISTERED when the email is taken.
   */
  async register(payload: RegisterPayload): Promise<IssuedSession> {
    const existing = await this.prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) {
      throw new AppError(
        ErrorCode.EMAIL_ALREADY_REGISTERED,
        {},
        "An account already exists for that email",
      );
    }

    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          fullName: payload.fullName,
          passwordHash: await this.passwords.hash(payload.password),
          role: UserRole.USER,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error, "email")) {
        throw new AppError(
          ErrorCode.EMAIL_ALREADY_REGISTERED,
          {},
          "An account already exists for that email",
        );
      }

      throw error;
    }

    Logger.log("INFO", LogTag.AUTH, "User registered", { userId: user.id });

    return this.sessions.start(user);
  }

  /**
   * Verifies the credentials of a user and opens a session.
   *
   * @param payload - Validated login payload.
   * @param clientKey - Address of the caller, used to scope the rate limit.
   * @returns The opened session.
   * @throws AppError with code INVALID_CREDENTIALS when the credentials fail.
   */
  async login(payload: LoginPayload, clientKey: string): Promise<IssuedSession> {
    const limiterKey = `${clientKey}:${payload.email}`;
    this.loginLimiter.consume(limiterKey);

    const user = await this.prisma.user.findUnique({ where: { email: payload.email } });
    const passwordMatches =
      user !== null && (await this.passwords.verify(payload.password, user.passwordHash));

    if (!user || !passwordMatches) {
      Logger.log("WARN", LogTag.AUTH, "Login rejected", { email: payload.email });
      throw new AppError(
        ErrorCode.INVALID_CREDENTIALS,
        {},
        "Email or password do not match an account",
      );
    }

    this.loginLimiter.reset(limiterKey);
    Logger.log("INFO", LogTag.AUTH, "User logged in", { userId: user.id, role: user.role });

    return this.sessions.start(user);
  }
}
