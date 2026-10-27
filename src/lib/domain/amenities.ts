/**
 * Amenities a space can offer. The database stores these stable keys and the
 * interface translates them, so the catalog stays multilingual.
 */
export const AMENITY_KEYS = [
  "wifi",
  "powerOutlets",
  "standingDesk",
  "monitor",
  "whiteboard",
  "videoConference",
  "naturalLight",
  "airConditioning",
  "soundproofBooth",
  "lockers",
  "coffee",
  "printer",
] as const;

/** Stable key of an amenity. */
export type AmenityKey = (typeof AMENITY_KEYS)[number];

/**
 * Narrows a stored amenity value to a known key.
 *
 * @param value - Amenity read from the database.
 * @returns True when the value is a translatable amenity key.
 */
export function isAmenityKey(value: string): value is AmenityKey {
  return (AMENITY_KEYS as readonly string[]).includes(value);
}
