/** Maximum size accepted for an uploaded space image. */
export const SPACE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Image formats accepted by the upload endpoint. */
export const SPACE_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** Image format accepted by the upload endpoint. */
export type SpaceImageMimeType = (typeof SPACE_IMAGE_MIME_TYPES)[number];

/** Value of the file input accept attribute. */
export const SPACE_IMAGE_ACCEPT = SPACE_IMAGE_MIME_TYPES.join(",");

/** Prefix of the public route that serves uploaded space images. */
export const SPACE_IMAGE_ROUTE_PREFIX = "/api/spaces/images/";

/** Image metadata returned after a successful upload. */
export interface UploadedSpaceImage {
  id: string;
  url: string;
}

/**
 * Builds the public URL of a stored space image.
 *
 * @param imageId - Identifier of the image row.
 * @returns The public path served by the image route.
 */
export function spaceImageUrl(imageId: string): string {
  return `${SPACE_IMAGE_ROUTE_PREFIX}${imageId}`;
}

/**
 * Extracts the image identifier from a stored image URL.
 *
 * @param imageUrl - URL stored in a space row.
 * @returns The image identifier, or null when the URL is a preset illustration.
 */
export function spaceImageIdFromUrl(imageUrl: string): string | null {
  if (!imageUrl.startsWith(SPACE_IMAGE_ROUTE_PREFIX)) {
    return null;
  }

  const imageId = imageUrl.slice(SPACE_IMAGE_ROUTE_PREFIX.length);

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageId)
    ? imageId
    : null;
}
