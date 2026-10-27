import { AppError, ErrorCode } from "@/server/errors";

/** Activation state of a space. */
export interface ActivatableSpace {
  isActive: boolean;
}

/**
 * Pure implementation of the space life cycle rules: spaces are never deleted,
 * they are deactivated, and a space with confirmed reservations that have not
 * finished cannot be deactivated (rule 13).
 */
export class SpacePolicy {
  /**
   * Applies rule 13: a space holding unfinished confirmed reservations stays active.
   *
   * @param pendingConfirmedReservations - Confirmed reservations that have not ended.
   * @throws AppError when the space still has reservations to honour.
   */
  assertDeactivatable(pendingConfirmedReservations: number): void {
    if (pendingConfirmedReservations > 0) {
      throw new AppError(
        ErrorCode.SPACE_HAS_FUTURE_RESERVATIONS,
        { reservations: pendingConfirmedReservations },
        "A space with pending confirmed reservations cannot be deactivated",
      );
    }
  }

  /**
   * Rejects deactivating a space that is already deactivated.
   *
   * @param space - Space being deactivated.
   * @throws AppError when the space is already inactive.
   */
  assertStillActive(space: ActivatableSpace): void {
    if (!space.isActive) {
      throw new AppError(
        ErrorCode.SPACE_ALREADY_INACTIVE,
        {},
        "The space is already deactivated",
      );
    }
  }
}
