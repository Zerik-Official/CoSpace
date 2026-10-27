import { application } from "@/server/container";
import { AppError, ErrorCode } from "@/server/errors";
import { requireAdmin } from "@/server/http/guards";
import { withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";

/**
 * Stores an image uploaded by an administrator. The file is kept in PostgreSQL
 * so the same flow works on Vercel, Docker and a plain VPS without a writable
 * public directory.
 *
 * @param request - Multipart request carrying the administrator session and the file.
 * @returns The identifier and public URL of the stored image.
 */
export const POST = withApiErrors("POST /api/admin/spaces/images", async (request) => {
  await requireAdmin(request);

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      { fields: "image" },
      "Request body is not valid multipart form data",
    );
  }

  const file = formData.get("image");

  if (!(file instanceof File)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      { fields: "image" },
      "Request must include an image file",
    );
  }

  const image = await application().spaceImages.store(file);

  return jsonData({ image }, 201);
});
