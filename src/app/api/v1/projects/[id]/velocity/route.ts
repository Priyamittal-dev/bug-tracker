import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import { sprintService } from "@/services/sprint.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: projectId } = await params;
    const velocity = await sprintService.getProjectVelocity(
      projectId,
      tenant.organizationId,
      tenant.userId,
    );

    return apiSuccess(velocity);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to get project velocity",
      "SERVER_ERROR",
      500,
    );
  }
}
