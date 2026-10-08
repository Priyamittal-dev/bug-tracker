import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import { TimeTrackingService } from "@/services/time-tracking.service";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: logId } = await params;
    const result = await TimeTrackingService.deleteTimeLog(
      tenant.userId,
      tenant.organizationId,
      logId,
      tenant.userRole,
    );

    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to delete time log",
      error.code || "SERVER_ERROR",
      error.statusCode || 500,
    );
  }
}
