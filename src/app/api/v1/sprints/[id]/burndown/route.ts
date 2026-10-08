import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from "@/lib/api-response";
import { sprintService } from "@/services/sprint.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const burndown = await sprintService.getSprintBurndown(
      id,
      tenant.organizationId,
      tenant.userId,
    );

    return apiSuccess(burndown);
  } catch (error: any) {
    if (error.code === "SPRINT_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to get sprint burndown",
      "SERVER_ERROR",
      500,
    );
  }
}
