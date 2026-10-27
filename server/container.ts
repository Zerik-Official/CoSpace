import { AppConfig } from "@/server/config";
import { prisma } from "@/server/db/client";
import { ReservationPolicy } from "@/server/domain/reservation-policy";
import { SpacePolicy } from "@/server/domain/space-policy";
import { VenueClock } from "@/lib/domain/venue-clock";
import { RateLimiter } from "@/server/http/rate-limiter";
import { requiresSecureCookies } from "@/server/http/cookies";
import { PasswordHasher } from "@/server/security/password-hasher";
import { TokenService } from "@/server/security/token-service";
import { AuthService } from "@/server/services/auth.service";
import { ReservationService } from "@/server/services/reservation.service";
import { SessionService } from "@/server/services/session.service";
import { SpaceService } from "@/server/services/space.service";

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_SECONDS = 300;

/**
 * Composition root of the application. It builds the infrastructure once and
 * injects it into the services, so route handlers, server pages and the proxy
 * all share the same instances instead of duplicating wiring.
 */
export class ApplicationContainer {
  /** Validated environment configuration. */
  readonly config: AppConfig;

  /** Venue clock used by every time based rule. */
  readonly clock: VenueClock;

  /** Token issuer and verifier. */
  readonly tokenService: TokenService;

  /** Password hasher. */
  readonly passwordHasher: PasswordHasher;

  /** Session lifecycle service. */
  readonly sessions: SessionService;

  /** Registration and login service. */
  readonly auth: AuthService;

  /** Space catalog and administration service. */
  readonly spaces: SpaceService;

  /** Reservation lifecycle service. */
  readonly reservations: ReservationService;

  /**
   * @param config - Application configuration, defaults to the process one.
   */
  constructor(config: AppConfig = AppConfig.current) {
    this.config = config;
    this.clock = new VenueClock(config.venueTimeZone);
    this.tokenService = TokenService.fromConfig(config);
    this.passwordHasher = new PasswordHasher();

    const secureCookies = requiresSecureCookies(config.appUrl);
    this.sessions = new SessionService(prisma, this.tokenService, secureCookies);
    this.auth = new AuthService(
      prisma,
      this.passwordHasher,
      this.sessions,
      new RateLimiter(LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_SECONDS),
    );

    const spacePolicy = new SpacePolicy();
    const reservationPolicy = new ReservationPolicy(this.clock);

    this.spaces = new SpaceService(prisma, spacePolicy, this.clock);
    this.reservations = new ReservationService(prisma, reservationPolicy, this.clock);
  }
}

let container: ApplicationContainer | undefined;

/**
 * Returns the shared composition root of the running process.
 *
 * @returns The application container.
 */
export function application(): ApplicationContainer {
  container ??= new ApplicationContainer();

  return container;
}
