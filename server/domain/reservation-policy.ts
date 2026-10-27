import { ReservationStatus, UserRole } from "@/lib/domain/enums";
import { RESERVATION_RULES } from "@/lib/domain/rules";
import { AppError, ErrorCode } from "@/server/errors";
import type { VenueClock } from "@/lib/domain/venue-clock";

/** Time span a reservation occupies. */
export interface ReservationWindow {
  startAt: Date;
  endAt: Date;
}

/** Principal requesting an operation on a reservation. */
export interface ReservationActor {
  id: string;
  role: UserRole;
}

/** Stored reservation data the cancellation rules need. */
export interface CancellableReservation {
  userId: string;
  status: ReservationStatus;
  startAt: Date;
}

/** Whether the venue allows bookings on a given space. */
export interface BookableSpace {
  isActive: boolean;
}

/**
 * Pure implementation of the reservation business rules. The class never talks
 * to the database: services fetch the surrounding facts and hand them over, so
 * every rule can be unit tested without infrastructure.
 */
export class ReservationPolicy {
  /**
   * @param clock - Venue clock used to evaluate time based rules.
   * @param now - Source of the current instant, replaceable in tests.
   */
  constructor(
    private readonly clock: VenueClock,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Checks whether two intervals share any instant. Touching endpoints do not
   * conflict, so a reservation ending at 12:00 and another starting at 12:00 are
   * compatible.
   *
   * @param first - Interval to compare.
   * @param second - Interval to compare against.
   * @returns True when both intervals overlap.
   */
  static overlaps(first: ReservationWindow, second: ReservationWindow): boolean {
    return (
      first.startAt.getTime() < second.endAt.getTime() &&
      second.startAt.getTime() < first.endAt.getTime()
    );
  }

  /**
   * Measures how many whole hours a window spans.
   *
   * @param window - Reservation window to measure.
   * @returns Number of whole hours.
   */
  hoursOf(window: ReservationWindow): number {
    return this.clock.hoursBetween(window.startAt, window.endAt);
  }

  /**
   * Computes the price of a reservation, always on the server. The value is
   * returned as a decimal string so it can be persisted without float drift.
   *
   * @param pricePerHour - Published hourly price of the space.
   * @param hours - Number of whole hours booked.
   * @returns Total price with two decimals.
   */
  calculateTotalPrice(pricePerHour: number, hours: number): string {
    const hourlyCents = Math.round(pricePerHour * 100);

    return ((hourlyCents * hours) / 100).toFixed(2);
  }

  /**
   * Applies the shape rules of a reservation: whole hours, duration between one
   * and four hours, inside the 07:00-21:00 opening window, not in the past and
   * no more than 30 days ahead.
   *
   * @param window - Requested reservation window.
   * @throws AppError when any of the shape rules is violated.
   */
  validateDraft(window: ReservationWindow): void {
    if (!this.clock.isWholeHour(window.startAt) || !this.clock.isWholeHour(window.endAt)) {
      throw new AppError(
        ErrorCode.RESERVATION_WINDOW_NOT_WHOLE_HOURS,
        {},
        "Reservation boundaries must fall on whole hours of the venue clock",
      );
    }

    if (window.endAt.getTime() <= window.startAt.getTime()) {
      throw new AppError(
        ErrorCode.RESERVATION_DURATION_OUT_OF_RANGE,
        {
          minHours: RESERVATION_RULES.minHours,
          maxHours: RESERVATION_RULES.maxHours,
        },
        "Reservation end must be after its start",
      );
    }

    const hours = this.hoursOf(window);
    if (
      window.endAt.getTime() - window.startAt.getTime() !== hours * 3_600_000 ||
      hours < RESERVATION_RULES.minHours ||
      hours > RESERVATION_RULES.maxHours
    ) {
      throw new AppError(
        ErrorCode.RESERVATION_DURATION_OUT_OF_RANGE,
        {
          minHours: RESERVATION_RULES.minHours,
          maxHours: RESERVATION_RULES.maxHours,
        },
        "Reservation duration is outside the allowed range",
      );
    }

    const startDayKey = this.clock.toDayKey(window.startAt);
    const endDayKey = this.clock.toDayKey(window.endAt);
    const startParts = this.clock.toParts(window.startAt);
    const endParts = this.clock.toParts(window.endAt);
    const startMinuteOfDay = startParts.hour * 60 + startParts.minute;
    const endMinuteOfDay = endParts.hour * 60 + endParts.minute;

    if (
      startDayKey !== endDayKey ||
      startMinuteOfDay < RESERVATION_RULES.openingHour * 60 ||
      startMinuteOfDay >= RESERVATION_RULES.closingHour * 60 ||
      endMinuteOfDay > RESERVATION_RULES.closingHour * 60
    ) {
      throw new AppError(
        ErrorCode.RESERVATION_OUTSIDE_OPENING_HOURS,
        {
          openingHour: RESERVATION_RULES.openingHour,
          closingHour: RESERVATION_RULES.closingHour,
        },
        "Reservation falls outside the opening hours of the venue",
      );
    }

    const currentInstant = this.now();
    if (window.startAt.getTime() <= currentInstant.getTime()) {
      throw new AppError(
        ErrorCode.RESERVATION_IN_THE_PAST,
        {},
        "Reservation must start in the future",
      );
    }

    if (this.clock.daysBetween(currentInstant, window.startAt) > RESERVATION_RULES.maxAdvanceDays) {
      throw new AppError(
        ErrorCode.RESERVATION_TOO_FAR_AHEAD,
        { maxDays: RESERVATION_RULES.maxAdvanceDays },
        "Reservation exceeds the booking window",
      );
    }
  }

  /**
   * Applies rule 7: an inactive space cannot receive new reservations.
   *
   * @param space - Space being booked.
   * @throws AppError when the space is deactivated.
   */
  assertSpaceIsActive(space: BookableSpace): void {
    if (!space.isActive) {
      throw new AppError(
        ErrorCode.SPACE_NOT_AVAILABLE,
        {},
        "Deactivated spaces cannot be reserved",
      );
    }
  }

  /**
   * Applies rule 4: a space cannot hold two confirmed reservations that overlap.
   *
   * @param conflicting - Confirmed reservations of the space overlapping the draft.
   * @throws AppError when at least one conflict exists.
   */
  assertSpaceSlotIsFree(conflicting: ReservationWindow[]): void {
    if (conflicting.length > 0) {
      throw new AppError(
        ErrorCode.RESERVATION_SPACE_OVERLAP,
        { conflicts: conflicting.length },
        "The space already has a confirmed reservation during that window",
      );
    }
  }

  /**
   * Applies rule 5: a user cannot hold two confirmed overlapping reservations,
   * even on different spaces.
   *
   * @param conflicting - Confirmed reservations of the user overlapping the draft.
   * @throws AppError when at least one conflict exists.
   */
  assertUserSlotIsFree(conflicting: ReservationWindow[]): void {
    if (conflicting.length > 0) {
      throw new AppError(
        ErrorCode.RESERVATION_USER_OVERLAP,
        { conflicts: conflicting.length },
        "The user already holds a confirmed reservation during that window",
      );
    }
  }

  /**
   * Applies rule 6: at most three future confirmed reservations per user.
   *
   * @param confirmedFutureReservations - Future confirmed reservations of the user.
   * @throws AppError when the quota is already reached.
   */
  assertFutureQuota(confirmedFutureReservations: number): void {
    if (confirmedFutureReservations >= RESERVATION_RULES.maxFutureReservations) {
      throw new AppError(
        ErrorCode.RESERVATION_FUTURE_LIMIT_REACHED,
        { maxReservations: RESERVATION_RULES.maxFutureReservations },
        "The user reached the limit of future reservations",
      );
    }
  }

  /**
   * Applies rules 9, 10 and 11: only the owner or an administrator may cancel,
   * the owner needs a two hour notice, and cancelling only changes the status.
   *
   * @param reservation - Reservation being cancelled.
   * @param actor - Principal requesting the cancellation.
   * @throws AppError when the actor is not allowed to cancel, yet.
   */
  assertCancellationAllowed(reservation: CancellableReservation, actor: ReservationActor): void {
    const violation = this.evaluateCancellation(reservation, actor);
    if (violation === null) {
      return;
    }

    if (violation === ErrorCode.RESERVATION_CANCELLATION_TOO_LATE) {
      throw new AppError(violation, {
        noticeHours: RESERVATION_RULES.cancellationNoticeHours,
      });
    }

    throw new AppError(violation);
  }

  /**
   * Tells whether an actor may cancel a reservation without throwing, so read
   * models can expose the outcome as a flag.
   *
   * @param reservation - Reservation being inspected.
   * @param actor - Principal requesting the cancellation.
   * @returns True when the cancellation would be accepted.
   */
  canCancel(reservation: CancellableReservation, actor: ReservationActor): boolean {
    return this.evaluateCancellation(reservation, actor) === null;
  }

  /**
   * Reads the first cancellation rule an actor violates.
   *
   * @param reservation - Reservation being cancelled.
   * @param actor - Principal requesting the cancellation.
   * @returns The violated error code, or null when the cancellation is allowed.
   */
  private evaluateCancellation(
    reservation: CancellableReservation,
    actor: ReservationActor,
  ): ErrorCode | null {
    const isAdministrator = actor.role === UserRole.ADMIN;
    const isOwner = reservation.userId === actor.id;

    if (!isAdministrator && !isOwner) {
      return ErrorCode.FORBIDDEN;
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      return ErrorCode.RESERVATION_ALREADY_CANCELLED;
    }

    if (isAdministrator) {
      return null;
    }

    const noticeMilliseconds = RESERVATION_RULES.cancellationNoticeHours * 3_600_000;
    if (reservation.startAt.getTime() - this.now().getTime() < noticeMilliseconds) {
      return ErrorCode.RESERVATION_CANCELLATION_TOO_LATE;
    }

    return null;
  }
}
