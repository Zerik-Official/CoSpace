import type { Reservation, Space, User } from "@/server/db/generated/client";

import type {
  AdminReservationDetail,
  DecimalValue,
  ReservationDetail,
  ReservationWithSpace,
  SessionUser,
  SpaceDetail,
  SpaceSummary,
} from "@/lib/domain/types";

/**
 * Reads a decimal column as a plain number for serialization.
 *
 * @param value - Decimal value coming from the database driver.
 * @returns The value as a number.
 */
export function decimalToNumber(value: DecimalValue): number {
  return value.toNumber();
}

/**
 * Maps a user row to the principal exposed by the session endpoints.
 *
 * @param user - User row loaded from the database.
 * @returns The session view of the user, never including the password hash.
 */
export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}

/**
 * Maps a space row to the summary shown in cards and lists.
 *
 * @param space - Space row loaded from the database.
 * @returns The summary view of the space.
 */
export function toSpaceSummary(space: Space): SpaceSummary {
  return {
    id: space.id,
    code: space.code,
    name: space.name,
    type: space.type,
    capacity: space.capacity,
    pricePerHour: decimalToNumber(space.pricePerHour),
    imageUrl: space.imageUrl,
    isActive: space.isActive,
  };
}

/**
 * Maps a space row to the full detail view.
 *
 * @param space - Space row loaded from the database.
 * @returns The detail view of the space.
 */
export function toSpaceDetail(space: Space): SpaceDetail {
  return {
    ...toSpaceSummary(space),
    description: space.description,
    amenities: space.amenities,
  };
}

/**
 * Maps a reservation joined with its space to the dashboard view.
 *
 * @param reservation - Reservation row including its space.
 * @param canCancel - Whether the requesting actor may still cancel it.
 * @returns The reservation detail view.
 */
export function toReservationDetail(
  reservation: ReservationWithSpace,
  canCancel: boolean,
): ReservationDetail {
  return {
    id: reservation.id,
    spaceId: reservation.spaceId,
    spaceCode: reservation.space.code,
    spaceName: reservation.space.name,
    spaceType: reservation.space.type,
    startAt: reservation.startAt.toISOString(),
    endAt: reservation.endAt.toISOString(),
    hours: Math.round(
      (reservation.endAt.getTime() - reservation.startAt.getTime()) / 3_600_000,
    ),
    totalPrice: decimalToNumber(reservation.totalPrice),
    status: reservation.status,
    createdAt: reservation.createdAt.toISOString(),
    cancelledAt: reservation.cancelledAt?.toISOString() ?? null,
    canCancel,
  };
}

/**
 * Maps a reservation including its owner to the administrator view.
 *
 * @param reservation - Reservation row including its space and owner.
 * @param canCancel - Whether the requesting administrator may still cancel it.
 * @returns The administrator view of the reservation.
 */
export function toAdminReservationDetail(
  reservation: ReservationWithSpace,
  canCancel: boolean,
): AdminReservationDetail {
  return {
    ...toReservationDetail(reservation, canCancel),
    userEmail: reservation.user?.email ?? "",
    userFullName: reservation.user?.fullName ?? "",
  };
}

/** Alias kept for readability where a raw reservation row is required. */
export type ReservationRow = Reservation;
