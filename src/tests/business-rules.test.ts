import { describe, expect, it } from "vitest";

import { VenueClock } from "@/lib/domain/venue-clock";
import { ReservationStatus, SpaceType, UserRole } from "@/lib/domain/enums";
import { ReservationPolicy } from "@/server/domain/reservation-policy";
import { SpacePolicy } from "@/server/domain/space-policy";
import { AppError, ErrorCode } from "@/server/errors";
import { createSpacePayloadSchema } from "@/server/validation/schemas";

const NOW = "2026-10-27T12:00:00-05:00";
const clock = new VenueClock("America/Bogota");
const policy = new ReservationPolicy(clock, () => new Date(NOW));

function at(value: string): Date {
  return new Date(value);
}

function windowOf(startAt: string, endAt: string): { startAt: Date; endAt: Date } {
  return { startAt: at(startAt), endAt: at(endAt) };
}

function expectCode(operation: () => void, code: ErrorCode): void {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
    return;
  }

  throw new Error(`Expected error ${code}`);
}

describe("ReservationPolicy.validateDraft", () => {
  it("accepts whole-hour windows inside the opening range", () => {
    expect(() =>
      policy.validateDraft(windowOf("2026-10-28T07:00:00-05:00", "2026-10-28T08:00:00-05:00")),
    ).not.toThrow();
    expect(() =>
      policy.validateDraft(windowOf("2026-10-28T10:00:00-05:00", "2026-10-28T14:00:00-05:00")),
    ).not.toThrow();
    expect(() =>
      policy.validateDraft(windowOf("2026-10-28T20:00:00-05:00", "2026-10-28T21:00:00-05:00")),
    ).not.toThrow();
  });

  it("rejects boundaries that are not whole hours", () => {
    expectCode(
      () =>
        policy.validateDraft(
          windowOf("2026-10-28T10:30:00-05:00", "2026-10-28T12:30:00-05:00"),
        ),
      ErrorCode.RESERVATION_WINDOW_NOT_WHOLE_HOURS,
    );
    expectCode(
      () =>
        policy.validateDraft(
          windowOf("2026-10-28T10:00:00.500-05:00", "2026-10-28T12:00:00.500-05:00"),
        ),
      ErrorCode.RESERVATION_WINDOW_NOT_WHOLE_HOURS,
    );
  });

  it("rejects durations outside the one-to-four-hour range", () => {
    expectCode(
      () =>
        policy.validateDraft(
          windowOf("2026-10-28T10:00:00-05:00", "2026-10-28T15:00:00-05:00"),
        ),
      ErrorCode.RESERVATION_DURATION_OUT_OF_RANGE,
    );
    expectCode(
      () =>
        policy.validateDraft(
          windowOf("2026-10-28T10:00:00-05:00", "2026-10-28T10:00:00-05:00"),
        ),
      ErrorCode.RESERVATION_DURATION_OUT_OF_RANGE,
    );
  });

  it("rejects windows that leave the 07:00-21:00 opening range", () => {
    expectCode(
      () =>
        policy.validateDraft(
          windowOf("2026-10-28T06:00:00-05:00", "2026-10-28T07:00:00-05:00"),
        ),
      ErrorCode.RESERVATION_OUTSIDE_OPENING_HOURS,
    );
    expectCode(
      () =>
        policy.validateDraft(
          windowOf("2026-10-28T20:00:00-05:00", "2026-10-28T22:00:00-05:00"),
        ),
      ErrorCode.RESERVATION_OUTSIDE_OPENING_HOURS,
    );
    expectCode(
      () =>
        policy.validateDraft(
          windowOf("2026-10-28T21:00:00-05:00", "2026-10-28T22:00:00-05:00"),
        ),
      ErrorCode.RESERVATION_OUTSIDE_OPENING_HOURS,
    );
  });

  it("rejects windows that cross midnight", () => {
    expectCode(
      () =>
        policy.validateDraft(
          windowOf("2026-10-28T20:00:00-05:00", "2026-10-29T00:00:00-05:00"),
        ),
      ErrorCode.RESERVATION_OUTSIDE_OPENING_HOURS,
    );
  });

  it("rejects reservations in the past", () => {
    expectCode(
      () =>
        policy.validateDraft(
          windowOf("2026-10-27T11:00:00-05:00", "2026-10-27T12:00:00-05:00"),
        ),
      ErrorCode.RESERVATION_IN_THE_PAST,
    );
  });

  it("enforces the thirty-day advance window", () => {
    expect(() =>
      policy.validateDraft(windowOf("2026-11-26T10:00:00-05:00", "2026-11-26T11:00:00-05:00")),
    ).not.toThrow();
    expectCode(
      () =>
        policy.validateDraft(
          windowOf("2026-11-27T10:00:00-05:00", "2026-11-27T11:00:00-05:00"),
        ),
      ErrorCode.RESERVATION_TOO_FAR_AHEAD,
    );
  });
});

describe("ReservationPolicy.overlaps", () => {
  it("treats touching endpoints as compatible", () => {
    const first = windowOf("2026-10-28T10:00:00-05:00", "2026-10-28T12:00:00-05:00");
    const second = windowOf("2026-10-28T12:00:00-05:00", "2026-10-28T14:00:00-05:00");

    expect(ReservationPolicy.overlaps(first, second)).toBe(false);
  });

  it("detects a real overlap", () => {
    const first = windowOf("2026-10-28T10:00:00-05:00", "2026-10-28T12:00:00-05:00");
    const second = windowOf("2026-10-28T11:00:00-05:00", "2026-10-28T13:00:00-05:00");

    expect(ReservationPolicy.overlaps(first, second)).toBe(true);
  });
});

describe("ReservationPolicy conflict and quota rules", () => {
  it("rejects a space conflict", () => {
    expectCode(
      () =>
        policy.assertSpaceSlotIsFree([
          windowOf("2026-10-28T11:00:00-05:00", "2026-10-28T12:00:00-05:00"),
        ]),
      ErrorCode.RESERVATION_SPACE_OVERLAP,
    );
  });

  it("rejects a user conflict", () => {
    expectCode(
      () =>
        policy.assertUserSlotIsFree([
          windowOf("2026-10-28T11:00:00-05:00", "2026-10-28T12:00:00-05:00"),
        ]),
      ErrorCode.RESERVATION_USER_OVERLAP,
    );
  });

  it("rejects a fourth future reservation", () => {
    expect(() => policy.assertFutureQuota(2)).not.toThrow();
    expectCode(() => policy.assertFutureQuota(3), ErrorCode.RESERVATION_FUTURE_LIMIT_REACHED);
  });

  it("rejects a reservation on an inactive space", () => {
    expectCode(
      () => policy.assertSpaceIsActive({ isActive: false }),
      ErrorCode.SPACE_NOT_AVAILABLE,
    );
  });
});

describe("ReservationPolicy cancellation rules", () => {
  const owner = { id: "user-1", role: UserRole.USER };
  const otherUser = { id: "user-2", role: UserRole.USER };
  const administrator = { id: "admin-1", role: UserRole.ADMIN };

  it("allows the owner to cancel with enough notice", () => {
    const reservation = {
      userId: owner.id,
      status: ReservationStatus.CONFIRMED,
      startAt: at("2026-10-27T15:00:00-05:00"),
    };

    expect(() => policy.assertCancellationAllowed(reservation, owner)).not.toThrow();
    expect(policy.canCancel(reservation, owner)).toBe(true);
  });

  it("rejects the owner when notice is below two hours", () => {
    const reservation = {
      userId: owner.id,
      status: ReservationStatus.CONFIRMED,
      startAt: at("2026-10-27T13:00:00-05:00"),
    };

    expectCode(
      () => policy.assertCancellationAllowed(reservation, owner),
      ErrorCode.RESERVATION_CANCELLATION_TOO_LATE,
    );
  });

  it("rejects users who do not own the reservation", () => {
    const reservation = {
      userId: owner.id,
      status: ReservationStatus.CONFIRMED,
      startAt: at("2026-10-27T18:00:00-05:00"),
    };

    expectCode(
      () => policy.assertCancellationAllowed(reservation, otherUser),
      ErrorCode.FORBIDDEN,
    );
  });

  it("allows an administrator without notice", () => {
    const reservation = {
      userId: owner.id,
      status: ReservationStatus.CONFIRMED,
      startAt: at("2026-10-27T12:30:00-05:00"),
    };

    expect(() => policy.assertCancellationAllowed(reservation, administrator)).not.toThrow();
  });

  it("rejects an already cancelled reservation", () => {
    const reservation = {
      userId: owner.id,
      status: ReservationStatus.CANCELLED,
      startAt: at("2026-10-27T18:00:00-05:00"),
    };

    expectCode(
      () => policy.assertCancellationAllowed(reservation, owner),
      ErrorCode.RESERVATION_ALREADY_CANCELLED,
    );
    expect(policy.canCancel(reservation, owner)).toBe(false);
  });
});

describe("SpacePolicy", () => {
  it("keeps a space active while it has pending reservations", () => {
    const spacePolicy = new SpacePolicy();

    expectCode(
      () => spacePolicy.assertDeactivatable(1),
      ErrorCode.SPACE_HAS_FUTURE_RESERVATIONS,
    );
    expect(() => spacePolicy.assertDeactivatable(0)).not.toThrow();
  });

  it("rejects deactivating an inactive space", () => {
    const spacePolicy = new SpacePolicy();

    expectCode(
      () => spacePolicy.assertStillActive({ isActive: false }),
      ErrorCode.SPACE_ALREADY_INACTIVE,
    );
  });
});

describe("Space validation", () => {
  const payload = {
    code: "DESK-01",
    name: "Desk 01",
    description: "A quiet desk next to the window.",
    type: SpaceType.DESK,
    capacity: 1,
    pricePerHour: 25_000,
    imageUrl: "/spaces/desk-a.svg",
    amenities: ["wifi"],
  };

  it("accepts a public image path", () => {
    expect(createSpacePayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("rejects external and protocol-relative image URLs", () => {
    expect(
      createSpacePayloadSchema.safeParse({ ...payload, imageUrl: "https://example.com/desk.svg" })
        .success,
    ).toBe(false);
    expect(
      createSpacePayloadSchema.safeParse({ ...payload, imageUrl: "//example.com/desk.svg" }).success,
    ).toBe(false);
  });
});
