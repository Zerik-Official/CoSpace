import type { PrismaClient } from "@/server/db/generated/client";
import { Prisma } from "@/server/db/generated/client";

import { ReservationStatus, UserRole } from "@/lib/domain/enums";
import type {
  AdminReservationDetail,
  ReservationDetail,
  SessionUser,
} from "@/lib/domain/types";
import type { ReservationPolicy, ReservationWindow } from "@/server/domain/reservation-policy";
import type { VenueClock } from "@/lib/domain/venue-clock";
import { isUniqueConstraintError } from "@/server/db/errors";
import { runSerializableTransaction } from "@/server/db/transactions";
import { AppError, ErrorCode } from "@/server/errors";
import { Logger, LogTag } from "@/server/logger";
import { toAdminReservationDetail, toReservationDetail } from "@/server/services/mappers";
import type { CreateReservationPayload, ReservationQuery } from "@/server/validation/schemas";

/** Relations every reservation view needs. */
const RESERVATION_INCLUDE = {
  space: { select: { code: true, name: true, type: true } },
} as const;

/** Relations the administrator view needs on top of the default ones. */
const ADMIN_RESERVATION_INCLUDE = {
  space: { select: { code: true, name: true, type: true } },
  user: { select: { email: true, fullName: true } },
} as const;

/**
 * Reservation lifecycle. Every rule is checked inside a SERIALIZABLE
 * transaction so two concurrent requests cannot both book the same slot, and the
 * price is always computed here, never accepted from the client.
 */
export class ReservationService {
  /**
   * @param prisma - Prisma client used to read and write reservations.
   * @param policy - Reservation business rules.
   * @param clock - Venue clock used to sort and slice the dashboard.
   */
  constructor(
    private readonly prisma: PrismaClient,
    private readonly policy: ReservationPolicy,
    private readonly clock: VenueClock,
  ) {}

  /**
   * Lists the reservations owned by an actor. Other users' reservations are
   * never reachable through this method.
   *
   * @param actor - Authenticated principal requesting the list.
   * @param query - Validated listing scope.
   * @returns The reservations of the actor, newest first.
   */
  async listOwn(actor: SessionUser, query: ReservationQuery): Promise<ReservationDetail[]> {
    const now = new Date();
    const scopeFilter =
      query.scope === "upcoming"
        ? { startAt: { gte: now } }
        : query.scope === "past"
          ? { startAt: { lt: now } }
          : {};

    const reservations = await this.prisma.reservation.findMany({
      where: { userId: actor.id, ...scopeFilter },
      include: RESERVATION_INCLUDE,
      orderBy: { startAt: query.scope === "past" ? "desc" : "asc" },
    });

    return reservations.map((reservation) =>
      toReservationDetail(reservation, this.policy.canCancel(reservation, actor)),
    );
  }

  /**
   * Lists every confirmed reservation still ahead of the venue, for the
   * administrator panel.
   *
   * @param actor - Authenticated administrator requesting the list.
   * @returns The upcoming reservations including their owner.
   */
  async listUpcomingForAdministration(
    actor: SessionUser,
  ): Promise<AdminReservationDetail[]> {
    this.assertAdministrator(actor);

    const reservations = await this.prisma.reservation.findMany({
      where: { status: ReservationStatus.CONFIRMED, endAt: { gt: new Date() } },
      include: ADMIN_RESERVATION_INCLUDE,
      orderBy: { startAt: "asc" },
      take: 50,
    });

    return reservations.map((reservation) =>
      toAdminReservationDetail(reservation, this.policy.canCancel(reservation, actor)),
    );
  }

  /**
   * Books a space for a user. The price is computed on the server and the whole
   * check set runs inside a SERIALIZABLE transaction.
   *
   * @param actor - Authenticated principal booking the space.
   * @param payload - Validated reservation payload.
   * @param idempotencyKey - Optional key that makes the creation repeatable.
   * @returns The created reservation.
   * @throws AppError with code NOT_FOUND when the space does not exist.
   */
  async create(
    actor: SessionUser,
    payload: CreateReservationPayload,
    idempotencyKey?: string,
  ): Promise<ReservationDetail> {
    if (idempotencyKey) {
      const replay = await this.prisma.reservation.findFirst({
        where: { idempotencyKey, userId: actor.id },
        include: RESERVATION_INCLUDE,
      });

      if (replay) {
        Logger.log("INFO", LogTag.RESERVATION, "Idempotent creation replayed", {
          reservationId: replay.id,
        });

        return toReservationDetail(replay, this.policy.canCancel(replay, actor));
      }
    }

    const window: ReservationWindow = {
      startAt: new Date(payload.startAt),
      endAt: new Date(payload.endAt),
    };

    this.policy.validateDraft(window);
    const hours = this.policy.hoursOf(window);

    try {
      const created = await runSerializableTransaction(
        this.prisma,
        async (transaction) => {
          const space = await transaction.space.findUnique({
            where: { id: payload.spaceId },
          });
          if (!space) {
            throw new AppError(ErrorCode.NOT_FOUND, {}, "Space does not exist");
          }

          this.policy.assertSpaceIsActive(space);

          const totalPrice = this.policy.calculateTotalPrice(
            space.pricePerHour.toNumber(),
            hours,
          );
          const now = new Date();
          const overlapping = {
            status: ReservationStatus.CONFIRMED,
            startAt: { lt: window.endAt },
            endAt: { gt: window.startAt },
          } satisfies Prisma.ReservationWhereInput;

          const spaceConflicts = await transaction.reservation.findMany({
            where: { spaceId: space.id, ...overlapping },
            select: { startAt: true, endAt: true },
          });
          this.policy.assertSpaceSlotIsFree(spaceConflicts);

          const userConflicts = await transaction.reservation.findMany({
            where: { userId: actor.id, ...overlapping },
            select: { startAt: true, endAt: true },
          });
          this.policy.assertUserSlotIsFree(userConflicts);

          const confirmedFutureReservations = await transaction.reservation.count({
            where: {
              userId: actor.id,
              status: ReservationStatus.CONFIRMED,
              startAt: { gt: now },
            },
          });
          this.policy.assertFutureQuota(confirmedFutureReservations);

          return transaction.reservation.create({
            data: {
              userId: actor.id,
              spaceId: space.id,
              startAt: window.startAt,
              endAt: window.endAt,
              totalPrice,
              status: ReservationStatus.CONFIRMED,
              idempotencyKey: idempotencyKey ?? null,
            },
            include: RESERVATION_INCLUDE,
          });
        },
        "reservation.create",
        () =>
          new AppError(
            ErrorCode.RESERVATION_SPACE_OVERLAP,
            {},
            "Concurrent bookings exhausted the retry budget",
          ),
      );

      Logger.log("INFO", LogTag.RESERVATION, "Reservation created", {
        reservationId: created.id,
        spaceId: created.spaceId,
        hours,
      });

      return toReservationDetail(created, this.policy.canCancel(created, actor));
    } catch (error) {
      if (isUniqueConstraintError(error, "idempotencyKey")) {
        const replay = idempotencyKey
          ? await this.prisma.reservation.findFirst({
              where: { idempotencyKey, userId: actor.id },
              include: RESERVATION_INCLUDE,
            })
          : null;

        if (replay) {
          return toReservationDetail(replay, this.policy.canCancel(replay, actor));
        }

        throw new AppError(
          ErrorCode.IDEMPOTENCY_KEY_CONFLICT,
          {},
          "The idempotency key belongs to another reservation",
        );
      }

      throw error;
    }
  }

  /**
   * Cancels a reservation. The row is preserved and only its status changes.
   *
   * @param actor - Authenticated principal requesting the cancellation.
   * @param reservationId - Identifier of the reservation.
   * @returns The cancelled reservation.
   * @throws AppError with code NOT_FOUND when the reservation does not exist.
   */
  async cancel(actor: SessionUser, reservationId: string): Promise<ReservationDetail> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: RESERVATION_INCLUDE,
    });

    if (!reservation) {
      throw new AppError(ErrorCode.NOT_FOUND, {}, "Reservation does not exist");
    }

    this.policy.assertCancellationAllowed(reservation, actor);

    const cancelled = await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.CANCELLED, cancelledAt: new Date() },
      include: RESERVATION_INCLUDE,
    });

    Logger.log("INFO", LogTag.RESERVATION, "Reservation cancelled", {
      reservationId: cancelled.id,
      actorId: actor.id,
    });

    return toReservationDetail(cancelled, this.policy.canCancel(cancelled, actor));
  }

  /**
   * Rejects an actor without the administrator role.
   *
   * @param actor - Authenticated principal being checked.
   * @throws AppError with code FORBIDDEN when the actor is not an administrator.
   */
  private assertAdministrator(actor: SessionUser): void {
    if (actor.role !== UserRole.ADMIN) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        {},
        "The operation requires the administrator role",
      );
    }
  }
}
