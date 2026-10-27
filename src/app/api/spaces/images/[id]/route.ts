import { application } from "@/server/container";
import { AppError, ErrorCode } from "@/server/errors";
import { readResourceId, withApiErrors } from "@/server/http/handler";

/**
 * Serves an uploaded space image. Image identifiers are immutable, so the
 * response can be cached forever by browsers and the Next.js image optimizer.
 *
 * @param request - Public request for the image.
 * @param context - Route context carrying the image identifier.
 * @returns The binary image with its detected content type.
 */
export const GET = withApiErrors<{ id: string }>(
  "GET /api/spaces/images/[id]",
  async (_request, context) => {
    const imageId = await readResourceId(context);
    const image = await application().spaceImages.find(imageId);

    if (!image) {
      throw new AppError(ErrorCode.NOT_FOUND, {}, "Space image does not exist");
    }

    return new Response(new Uint8Array(image.data), {
      status: 200,
      headers: {
        "content-type": image.mimeType,
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  },
);
