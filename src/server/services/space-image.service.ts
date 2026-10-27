import type { PrismaClient } from "@/server/db/generated/client";

import {
  SPACE_IMAGE_MAX_BYTES,
  SPACE_IMAGE_MIME_TYPES,
  spaceImageIdFromUrl,
  spaceImageUrl,
  type SpaceImageMimeType,
  type UploadedSpaceImage,
} from "@/lib/domain/space-images";
import { AppError, ErrorCode } from "@/server/errors";
import { Logger, LogTag } from "@/server/logger";

/** Stored binary image returned by the public image route. */
export interface StoredSpaceImage {
  mimeType: string;
  data: Uint8Array;
}

/**
 * Detects the image format from its first bytes instead of trusting the MIME
 * type supplied by the browser.
 *
 * @param data - Raw bytes of the uploaded file.
 * @returns The detected format, or null when it is not supported.
 */
function detectImageMime(data: Uint8Array): SpaceImageMimeType | null {
  const isPng =
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a;

  if (isPng) {
    return "image/png";
  }

  const isJpeg = data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;

  if (isJpeg) {
    return "image/jpeg";
  }

  const isWebp =
    data.length >= 12 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50;

  if (isWebp) {
    return "image/webp";
  }

  return null;
}

/**
 * Rejects an invalid image with a field-level validation error.
 *
 * @param message - Developer facing reason for the rejection.
 * @returns The application error to throw.
 */
function invalidImage(message: string): AppError {
  return new AppError(ErrorCode.VALIDATION_ERROR, { fields: "image" }, message);
}

/**
 * Stores the binary images uploaded by administrators. Keeping the bytes in
 * PostgreSQL makes uploads work on read-only hosts such as Vercel without
 * requiring a separate object storage account.
 */
export class SpaceImageService {
  /**
   * @param prisma - Prisma client used to read and write image rows.
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Validates and stores one uploaded image.
   *
   * @param file - File received in the multipart form.
   * @returns The identifier and public URL of the stored image.
   * @throws AppError with code VALIDATION_ERROR when the format or size is invalid.
   */
  async store(file: File): Promise<UploadedSpaceImage> {
    const declaredType = file.type.toLowerCase();

    if (declaredType && !(SPACE_IMAGE_MIME_TYPES as readonly string[]).includes(declaredType)) {
      throw invalidImage("Image must be a PNG, JPEG or WebP file");
    }

    if (file.size === 0) {
      throw invalidImage("Image file is empty");
    }

    if (file.size > SPACE_IMAGE_MAX_BYTES) {
      throw invalidImage("Image must not exceed 2 MB");
    }

    const data = new Uint8Array(await file.arrayBuffer());

    if (data.byteLength === 0 || data.byteLength > SPACE_IMAGE_MAX_BYTES) {
      throw invalidImage("Image file has an invalid size");
    }

    const detectedType = detectImageMime(data);

    if (!detectedType || (declaredType && declaredType !== detectedType)) {
      throw invalidImage("Image content does not match a supported image format");
    }

    const image = await this.prisma.spaceImage.create({
      data: {
        mimeType: detectedType,
        data,
      },
      select: { id: true },
    });

    Logger.log("INFO", LogTag.SPACE, "Space image stored", {
      imageId: image.id,
      bytes: data.byteLength,
    });

    return { id: image.id, url: spaceImageUrl(image.id) };
  }

  /**
   * Loads the bytes of a stored image.
   *
   * @param imageId - Identifier of the image row.
   * @returns The image bytes and MIME type, or null when it does not exist.
   */
  async find(imageId: string): Promise<StoredSpaceImage | null> {
    const image = await this.prisma.spaceImage.findUnique({
      where: { id: imageId },
      select: { mimeType: true, data: true },
    });

    return image ? { mimeType: image.mimeType, data: image.data } : null;
  }

  /**
   * Deletes an image only when no space references it. This lets the form clean
   * up an upload that failed to save without breaking an image already in use.
   *
   * @param imageId - Identifier of the image row.
   */
  async discard(imageId: string): Promise<void> {
    const referenced = await this.prisma.space.count({
      where: { imageUrl: spaceImageUrl(imageId) },
    });

    if (referenced === 0) {
      await this.prisma.spaceImage.deleteMany({ where: { id: imageId } });
    }
  }

  /**
   * Deletes the image behind a stored URL when it is no longer referenced.
   *
   * @param imageUrl - URL previously stored in a space row.
   */
  async discardByUrl(imageUrl: string): Promise<void> {
    const imageId = spaceImageIdFromUrl(imageUrl);

    if (imageId) {
      await this.discard(imageId);
    }
  }
}
