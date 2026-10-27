import { application } from "@/server/container";
import { validateSearchParams, withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";
import { catalogQuerySchema } from "@/server/validation/schemas";

/**
 * Lists the spaces published in the catalog for one venue day, with the
 * occupancy of each one so the interface can render its hourly strip.
 *
 * @param request - Request carrying the optional catalog filters.
 * @returns The catalog payload for the requested day.
 */
export const GET = withApiErrors("GET /api/spaces", async (request) => {
  const query = validateSearchParams(request, catalogQuerySchema);
  const catalog = await application().spaces.listCatalog(query);

  return jsonData(catalog);
});
