import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import { WatcherService } from "@/services/watcher.service";
import { listWatchedIssuesQuerySchema } from "@/lib/validations/watcher";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = listWatchedIssuesQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const feed = await WatcherService.listWatchedIssues(
      tenant.organizationId,
      tenant.userId,
      parsed.data,
    );

    return apiSuccess(feed);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to list watched issues",
      "SERVER_ERROR",
      500,
    );
  }
}
