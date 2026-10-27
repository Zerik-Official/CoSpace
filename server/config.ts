import { z } from "zod";

const durationSchema = z.string().regex(/^\d+(s|m|h|d)?$/, "Invalid duration literal");

const configSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: durationSchema.default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: durationSchema.default("7d"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_VENUE_TIMEZONE: z.string().min(1).default("America/Bogota"),
  NEXT_PUBLIC_VENUE_CURRENCY: z.string().length(3).default("COP"),
  SEED_ADMIN_EMAIL: z.email().default("admin@cospace.dev"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("Admin1234!"),
  SEED_ADMIN_NAME: z.string().min(1).default("Ada Restrepo"),
});

type RawConfigValues = z.infer<typeof configSchema>;

/** Environment values the application needs, already validated and typed. */
export interface AppConfigValues {
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  appUrl: string;
  venueTimeZone: string;
  venueCurrency: string;
  seedAdminEmail: string;
  seedAdminPassword: string;
  seedAdminName: string;
}

/**
 * Converts a duration literal such as "15m" or "7d" into seconds.
 *
 * @param literal - Duration literal with an optional s, m, h or d suffix.
 * @returns Duration expressed in seconds.
 * @throws Error when the literal carries an unsupported suffix.
 */
export function parseDurationToSeconds(literal: string): number {
  const match = /^(\d+)(s|m|h|d)?$/.exec(literal);
  if (!match) {
    throw new Error(`Unsupported duration literal: ${literal}`);
  }

  const amount = Number(match[1]);
  const suffix = match[2] ?? "s";
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

  return amount * multipliers[suffix];
}

let cachedConfig: AppConfig | undefined;

/**
 * Typed accessor for the application environment. Reading it fails fast when a
 * required variable is missing, so misconfiguration surfaces at boot.
 */
export class AppConfig {
  private constructor(private readonly values: AppConfigValues) {}

  /**
   * Validates an environment source and builds the configuration object.
   *
   * @param source - Environment source, defaults to `process.env`.
   * @returns A validated configuration instance.
   * @throws Error listing every invalid or missing variable.
   */
  static load(source: NodeJS.ProcessEnv = process.env): AppConfig {
    const parsed = configSchema.safeParse(source);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
        .join("; ");
      throw new Error(`Invalid environment configuration -> ${details}`);
    }

    return new AppConfig(AppConfig.toValues(parsed.data));
  }

  /**
   * Returns the memoized configuration of the running process.
   *
   * @returns The configuration instance for this process.
   */
  static get current(): AppConfig {
    cachedConfig ??= AppConfig.load();
    return cachedConfig;
  }

  /** Base URL the application is served from. */
  get appUrl(): string {
    return this.values.appUrl;
  }

  /** PostgreSQL connection string used by the Prisma driver adapter. */
  get databaseUrl(): string {
    return this.values.databaseUrl;
  }

  /** HS256 secret that signs access tokens. */
  get jwtAccessSecret(): string {
    return this.values.jwtAccessSecret;
  }

  /** Secret reserved for refresh-token derivation material. */
  get jwtRefreshSecret(): string {
    return this.values.jwtRefreshSecret;
  }

  /** Access token lifetime in seconds. */
  get accessTokenTtlSeconds(): number {
    return this.values.accessTokenTtlSeconds;
  }

  /** Refresh token lifetime in seconds. */
  get refreshTokenTtlSeconds(): number {
    return this.values.refreshTokenTtlSeconds;
  }

  /** IANA time zone the venue operates in. */
  get venueTimeZone(): string {
    return this.values.venueTimeZone;
  }

  /** ISO-4217 currency prices are published in. */
  get venueCurrency(): string {
    return this.values.venueCurrency;
  }

  /** Email assigned to the administrator created by the seed. */
  get seedAdminEmail(): string {
    return this.values.seedAdminEmail;
  }

  /** Plain password assigned to the administrator created by the seed. */
  get seedAdminPassword(): string {
    return this.values.seedAdminPassword;
  }

  /** Display name assigned to the administrator created by the seed. */
  get seedAdminName(): string {
    return this.values.seedAdminName;
  }

  private static toValues(raw: RawConfigValues): AppConfigValues {
    return {
      databaseUrl: raw.DATABASE_URL,
      jwtAccessSecret: raw.JWT_ACCESS_SECRET,
      jwtRefreshSecret: raw.JWT_REFRESH_SECRET,
      accessTokenTtlSeconds: parseDurationToSeconds(raw.ACCESS_TOKEN_EXPIRES_IN),
      refreshTokenTtlSeconds: parseDurationToSeconds(raw.REFRESH_TOKEN_EXPIRES_IN),
      appUrl: raw.NEXT_PUBLIC_APP_URL,
      venueTimeZone: raw.NEXT_PUBLIC_VENUE_TIMEZONE,
      venueCurrency: raw.NEXT_PUBLIC_VENUE_CURRENCY,
      seedAdminEmail: raw.SEED_ADMIN_EMAIL,
      seedAdminPassword: raw.SEED_ADMIN_PASSWORD,
      seedAdminName: raw.SEED_ADMIN_NAME,
    };
  }
}
