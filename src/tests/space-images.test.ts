import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorCode } from "@/lib/domain/errors";
import {
  SPACE_IMAGE_MAX_BYTES,
  spaceImageIdFromUrl,
  spaceImageUrl,
} from "@/lib/domain/space-images";
import type { PrismaClient } from "@/server/db/generated/client";
import { Logger } from "@/server/logger";
import { SpaceImageService } from "@/server/services/space-image.service";

const IMAGE_ID = "0192f3a4-5b6c-7d8e-9f01-23456789abcd";
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fakePrisma(): {
  prisma: PrismaClient;
  create: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn().mockResolvedValue({ id: IMAGE_ID });
  const count = vi.fn().mockResolvedValue(0);
  const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
  const prisma = {
    spaceImage: { create, count: vi.fn(), deleteMany, findUnique: vi.fn() },
    space: { count },
  } as unknown as PrismaClient;

  return { prisma, create, count, deleteMany };
}

describe("Space image URLs", () => {
  it("builds and recognizes the stored image path", () => {
    const url = spaceImageUrl(IMAGE_ID);

    expect(url).toBe(`/api/spaces/images/${IMAGE_ID}`);
    expect(spaceImageIdFromUrl(url)).toBe(IMAGE_ID);
  });

  it("ignores preset illustrations and malformed identifiers", () => {
    expect(spaceImageIdFromUrl("/spaces/desk-a.svg")).toBeNull();
    expect(spaceImageIdFromUrl("/api/spaces/images/not-a-uuid")).toBeNull();
  });
});

describe("SpaceImageService", () => {
  beforeEach(() => {
    vi.spyOn(Logger, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores a supported image and returns its public URL", async () => {
    const { prisma, create } = fakePrisma();
    const service = new SpaceImageService(prisma);
    const file = new File([PNG_SIGNATURE], "space.png", { type: "image/png" });

    await expect(service.store(file)).resolves.toEqual({
      id: IMAGE_ID,
      url: `/api/spaces/images/${IMAGE_ID}`,
    });
    expect(create).toHaveBeenCalledWith({
      data: { mimeType: "image/png", data: expect.any(Uint8Array) },
      select: { id: true },
    });
  });

  it("rejects content that does not match a supported image", async () => {
    const { prisma, create } = fakePrisma();
    const service = new SpaceImageService(prisma);
    const file = new File([new Uint8Array([1, 2, 3, 4])], "fake.png", { type: "image/png" });

    await expect(service.store(file)).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("does not delete an image that a space still references", async () => {
    const { prisma, count, deleteMany } = fakePrisma();
    const service = new SpaceImageService(prisma);
    count.mockResolvedValueOnce(1);

    await service.discard(IMAGE_ID);

    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("deletes an image that no space references", async () => {
    const { prisma, deleteMany } = fakePrisma();
    const service = new SpaceImageService(prisma);

    await service.discard(IMAGE_ID);

    expect(deleteMany).toHaveBeenCalledWith({ where: { id: IMAGE_ID } });
  });

  it("rejects images above the size limit", async () => {
    const { prisma } = fakePrisma();
    const service = new SpaceImageService(prisma);
    const file = new File([new Uint8Array(SPACE_IMAGE_MAX_BYTES + 1)], "large.png", {
      type: "image/png",
    });

    await expect(service.store(file)).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    });
  });
});
