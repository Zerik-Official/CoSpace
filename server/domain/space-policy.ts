import { AppError, ErrorCode } from "@/server/errors";

/** Activation state of a space. */
export interface ActivatableSpace {
  isActive: boolean;
}

/**
 * Pure implementation of the space life cycle rules: spaces are never deleted,
 * they are deactivated, and a space with future confirmed reservations cannot be
 * deactivated (rule 13).
 */
export class SpacePolicy {
  /**
   * Applies rule 13: a space holding future confirmed reservations stays active.
   *
   * @param futureConfirmedReservations - Future confirmed reservations of the space.
   * @throws AppError when the space still has reservations to honour.
   */
  assertDeactivatable(futureConfirmedReservations: number): void {
    if (futureConfirmedReservations > 0) {
      throw new AppError(
        ErrorCode.SPACE_HAS_FUTURE_RESERVATIONS,
        { reservations: futureConfirmedReservations },
        "A space with future confirmed reservations cannot be deactivated",
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
