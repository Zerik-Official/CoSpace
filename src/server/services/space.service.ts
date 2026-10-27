import type { PrismaClient } from "@/server/db/generated/client";

import { ReservationStatus } from "@/lib/domain/enums";
import { RESERVATION_RULES } from "@/lib/domain/rules";
import type {
  AdminSpaceEntry,
  AvailabilityInterval,
  SpaceAvailability,
  SpaceCatalogEntry,
  SpaceDetail,
} from "@/lib/domain/types";
import type { VenueClock } from "@/lib/domain/venue-clock";
import type { SpacePolicy } from "@/server/domain/space-policy";
import { AppError, ErrorCode } from "@/server/errors";
import { isUniqueConstraintError } from "@/server/db/errors";
import { runSerializableTransaction } from "@/server/db/transactions";
import { Logger, LogTag } from "@/server/logger";
import { toSpaceDetail, toSpaceSummary } from "@/server/services/mappers";
import type { CatalogQuery, CreateSpacePayload, UpdateSpacePayload } from "@/server/validation/schemas";

/** Catalog page payload: one venue day plus the spaces serving it. */
export interface CatalogResult {
  venueDate: string;
  venueDays: string[];
  spaces: SpaceCatalogEntry[];
}

/**
 * Space catalog and administration. Spaces are never deleted: deactivating one
 * hides it from the public catalog while keeping every historic reservation.
 */
export class SpaceService {
  /**
   * @param prisma - Prisma client used to read and write spaces.
   * @param policy - Space life cycle rules.
   * @param clock - Venue clock used to resolve catalog days.
   */
  constructor(
    private readonly prisma: PrismaClient,
    private readonly policy: SpacePolicy,
    private readonly clock: VenueClock,
  ) {}

  /**
   * Lists the active spaces of a venue day together with their occupancy.
   *
   * @param query - Validated catalog filters.
   * @returns The catalog payload for the requested day.
   */
  async listCatalog(query: CatalogQuery): Promise<CatalogResult> {
    const venueDay = this.resolveVenueDay(query.date);
    const spaces = await this.prisma.space.findMany({
      where: {
        isActive: true,
        ...(query.type ? { type: query.type } : {}),
        ...(query.minCapacity ? { capacity: { gte: query.minCapacity } } : {}),
      },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });

    const busyBySpace = await this.loadBusyIntervals(
      spaces.map((space) => space.id),
      venueDay,
    );

    return {
      venueDate: venueDay,
      venueDays: this.clock.upcomingDayKeys(new Date(), RESERVATION_RULES.catalogPreviewDays),
      spaces: spaces.map((space) => ({
        ...toSpaceSummary(space),
        description: space.description,
        venueDate: venueDay,
        busyIntervals: busyBySpace.get(space.id) ?? [],
      })),
    };
  }

  /**
   * Loads the public detail of a space. Deactivated spaces are invisible.
   *
   * @param spaceId - Identifier of the space.
   * @returns The detail view of the space.
   * @throws AppError with code NOT_FOUND when the space is missing or inactive.
   */
  async findPublicDetail(spaceId: string): Promise<SpaceDetail> {
    const space = await this.prisma.space.findFirst({
      where: { id: spaceId, isActive: true },
    });

    if (!space) {
      throw new AppError(ErrorCode.NOT_FOUND, {}, "Space is missing or deactivated");
    }

    return toSpaceDetail(space);
  }

  /**
   * Lists the occupancy of one space for one venue day.
   *
   * @param spaceId - Identifier of the space.
   * @param venueDate - Venue day key in YYYY-MM-DD form.
   * @returns The availability of the space on that day.
   * @throws AppError with code NOT_FOUND when the space is missing or inactive.
   */
  async findAvailability(spaceId: string, venueDate: string): Promise<SpaceAvailability> {
    const space = await this.prisma.space.findFirst({
      where: { id: spaceId, isActive: true },
      select: { id: true },
    });

    if (!space) {
      throw new AppError(ErrorCode.NOT_FOUND, {}, "Space is missing or deactivated");
    }

    const busyBySpace = await this.loadBusyIntervals([space.id], venueDate);

    return {
      spaceId: space.id,
      venueDate,
      busyIntervals: busyBySpace.get(space.id) ?? [],
    };
  }

  /**
   * Lists every space for the administrator panel, including inactive ones.
   *
   * @returns The spaces with the count of reservations blocking deactivation.
   */
  async listForAdministration(): Promise<AdminSpaceEntry[]> {
    const spaces = await this.prisma.space.findMany({ orderBy: { code: "asc" } });
    const futureCounts = await this.prisma.reservation.groupBy({
      by: ["spaceId"],
      where: { status: ReservationStatus.CONFIRMED, endAt: { gt: new Date() } },
      _count: { _all: true },
    });

    const countBySpace = new Map(
      futureCounts.map((entry) => [entry.spaceId, entry._count._all]),
    );

    return spaces.map((space) => ({
      ...toSpaceDetail(space),
      upcomingReservations: countBySpace.get(space.id) ?? 0,
    }));
  }

  /**
   * Creates a new space in the catalog.
   *
   * @param payload - Validated space payload.
   * @returns The created space.
   * @throws AppError with code VALIDATION_ERROR when the code is already used.
   */
  async create(payload: CreateSpacePayload): Promise<SpaceDetail> {
    try {
      const space = await this.prisma.space.create({ data: payload });

      Logger.log("INFO", LogTag.SPACE, "Space created", { spaceId: space.id, code: space.code });
      return toSpaceDetail(space);
    } catch (error) {
      if (isUniqueConstraintError(error, "code")) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          { fields: "code" },
          "The space code is already in use",
        );
      }

      throw error;
    }
  }

  /**
   * Updates the editable fields of a space.
   *
   * @param spaceId - Identifier of the space.
   * @param payload - Validated partial space payload.
   * @returns The updated space.
   * @throws AppError with code NOT_FOUND when the space does not exist.
   */
  async update(spaceId: string, payload: UpdateSpacePayload): Promise<SpaceDetail> {
    const existing = await this.prisma.space.findUnique({ where: { id: spaceId } });
    if (!existing) {
      throw new AppError(ErrorCode.NOT_FOUND, {}, "Space does not exist");
    }

    try {
      const space = await this.prisma.space.update({ where: { id: spaceId }, data: payload });

      Logger.log("INFO", LogTag.SPACE, "Space updated", { spaceId: space.id });
      return toSpaceDetail(space);
    } catch (error) {
      if (isUniqueConstraintError(error, "code")) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          { fields: "code" },
          "The space code is already in use",
        );
      }

      throw error;
    }
  }

  /**
   * Deactivates a space. The row is preserved so its history stays readable.
   *
   * @param spaceId - Identifier of the space.
   * @returns The deactivated space.
   * @throws AppError with code NOT_FOUND when the space does not exist.
   * @throws AppError with code SPACE_HAS_FUTURE_RESERVATIONS when rule 13 blocks it.
   */
  async deactivate(spaceId: string): Promise<SpaceDetail> {
    const deactivated = await runSerializableTransaction(
      this.prisma,
      async (transaction) => {
        const space = await transaction.space.findUnique({ where: { id: spaceId } });
        if (!space) {
          throw new AppError(ErrorCode.NOT_FOUND, {}, "Space does not exist");
        }

        this.policy.assertStillActive(space);

        const activeReservations = await transaction.reservation.count({
          where: {
            spaceId,
            status: ReservationStatus.CONFIRMED,
            endAt: { gt: new Date() },
          },
        });
        this.policy.assertDeactivatable(activeReservations);

        return transaction.space.update({
          where: { id: spaceId },
          data: { isActive: false },
        });
      },
      "space.deactivate",
      () =>
        new AppError(
          ErrorCode.CONCURRENT_MODIFICATION,
          {},
          "Concurrent reservations blocked the deactivation",
        ),
    );

    Logger.log("INFO", LogTag.SPACE, "Space deactivated", { spaceId });

    return toSpaceDetail(deactivated);
  }

  /**
   * Normalizes the requested venue day, defaulting to today at the venue.
   *
   * @param requested - Day key received from the query string, if any.
   * @returns The venue day key to serve.
   */
  private resolveVenueDay(requested?: string): string {
    return requested ?? this.clock.toDayKey(new Date());
  }

  /**
   * Groups the confirmed reservations of the given spaces inside one venue day.
   *
   * @param spaceIds - Spaces whose occupancy is required.
   * @param venueDate - Venue day key in YYYY-MM-DD form.
   * @returns Busy intervals keyed by space identifier.
   */
  private async loadBusyIntervals(
    spaceIds: string[],
    venueDate: string,
  ): Promise<Map<string, AvailabilityInterval[]>> {
    const busyBySpace = new Map<string, AvailabilityInterval[]>();
    if (spaceIds.length === 0) {
      return busyBySpace;
    }

    const dayStart = this.clock.fromDayKeyAndHour(venueDate, 0);
    const dayEnd = this.clock.fromDayKeyAndHour(this.clock.shiftDayKey(venueDate, 1), 0);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        spaceId: { in: spaceIds },
        status: ReservationStatus.CONFIRMED,
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { spaceId: true, startAt: true, endAt: true },
      orderBy: { startAt: "asc" },
    });

    for (const reservation of reservations) {
      const intervals = busyBySpace.get(reservation.spaceId) ?? [];
      intervals.push({
        startAt: reservation.startAt.toISOString(),
        endAt: reservation.endAt.toISOString(),
      });
      busyBySpace.set(reservation.spaceId, intervals);
    }

    return busyBySpace;
  }
}
