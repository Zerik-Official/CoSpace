import { z } from "zod";

import { SpaceType } from "@/lib/domain/enums";

/** Venue day key in YYYY-MM-DD form. */
export const venueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD venue date");

const emailSchema = z.email().trim().toLowerCase().max(180);

const turnstileTokenSchema = z.string().trim().min(1).max(4096);

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(72, "Password must not exceed 72 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one digit");

const spaceTypeSchema = z.enum([SpaceType.DESK, SpaceType.MEETING_ROOM, SpaceType.CABIN]);

const publicImagePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => value.startsWith("/") && !value.startsWith("//"), {
    message: "Image must be a path inside the public folder",
  });

/** Payload accepted by the registration endpoint. */
export const registerPayloadSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  turnstileToken: turnstileTokenSchema,
});

/** Payload accepted by the login endpoint. */
export const loginPayloadSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
  turnstileToken: turnstileTokenSchema,
});

/** Payload accepted by the reservation creation endpoint. */
export const createReservationPayloadSchema = z.object({
  spaceId: z.uuid(),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
});

/** Payload accepted by the space creation endpoint. */
export const createSpacePayloadSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .regex(/^[A-Z0-9-]+$/, "Code must be uppercase letters, digits or dashes"),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  type: spaceTypeSchema,
  capacity: z.number().int().min(1).max(100),
  pricePerHour: z.number().positive().max(10_000_000),
  imageUrl: publicImagePathSchema,
  amenities: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

/** Payload accepted by the space update endpoint, every field is optional. */
export const updateSpacePayloadSchema = createSpacePayloadSchema.partial();

/** Search parameters accepted by the public catalog. */
export const catalogQuerySchema = z.object({
  type: spaceTypeSchema.optional(),
  date: venueDateSchema.optional(),
  minCapacity: z.coerce.number().int().min(1).max(100).optional(),
});

/** Search parameters accepted by the availability endpoint. */
export const availabilityQuerySchema = z.object({
  date: venueDateSchema.optional(),
});

/** Search parameters accepted by the own reservations endpoint. */
export const reservationQuerySchema = z.object({
  scope: z.enum(["upcoming", "past", "all"]).default("all"),
});

/** Types inferred from the schemas above, reused by the services. */
export type RegisterPayload = z.infer<typeof registerPayloadSchema>;
export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type CreateReservationPayload = z.infer<typeof createReservationPayloadSchema>;
export type CreateSpacePayload = z.infer<typeof createSpacePayloadSchema>;
export type UpdateSpacePayload = z.infer<typeof updateSpacePayloadSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type ReservationQuery = z.infer<typeof reservationQuerySchema>;
