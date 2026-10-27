import type { ReservationStatus, SpaceType, UserRole } from "@/lib/domain/enums";

/** Authenticated principal returned by the session endpoints. */
export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/** Interval of venue local time expressed as ISO-8601 instants. */
export interface AvailabilityInterval {
  startAt: string;
  endAt: string;
}

/** Fields every space view shares. */
export interface SpaceSummary {
  id: string;
  code: string;
  name: string;
  type: SpaceType;
  capacity: number;
  pricePerHour: number;
  imageUrl: string;
  isActive: boolean;
}

/** Full space view rendered by the detail page. */
export interface SpaceDetail extends SpaceSummary {
  description: string;
  amenities: string[];
}

/** Catalog row: a space plus its occupancy for one venue day. */
export interface SpaceCatalogEntry extends SpaceSummary {
  description: string;
  venueDate: string;
  busyIntervals: AvailabilityInterval[];
}

/** Occupancy of a single space for a single venue day. */
export interface SpaceAvailability {
  spaceId: string;
  venueDate: string;
  busyIntervals: AvailabilityInterval[];
}

/** Reservation as consumed by the dashboard and the admin panel. */
export interface ReservationDetail {
  id: string;
  spaceId: string;
  spaceCode: string;
  spaceName: string;
  spaceType: SpaceType;
  startAt: string;
  endAt: string;
  hours: number;
  totalPrice: number;
  status: ReservationStatus;
  createdAt: string;
  cancelledAt: string | null;
  canCancel: boolean;
}

/** Reservation as consumed by the administrator panel, including its owner. */
export interface AdminReservationDetail extends ReservationDetail {
  userEmail: string;
  userFullName: string;
}

/** Space row enriched with the reservations that still block its deactivation. */
export interface AdminSpaceEntry extends SpaceDetail {
  upcomingReservations: number;
}

/** Reservation row joined with its space, as stored by the API layer. */
export interface ReservationWithSpace {
  id: string;
  spaceId: string;
  startAt: Date;
  endAt: Date;
  totalPrice: DecimalValue;
  status: ReservationStatus;
  createdAt: Date;
  cancelledAt: Date | null;
  space: {
    code: string;
    name: string;
    type: SpaceType;
  };
  user?: {
    email: string;
    fullName: string;
  };
}

/** Any value that can be read as a decimal number, such as a Prisma Decimal. */
export interface DecimalValue {
  toNumber(): number;
}
