import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import { TimeTrackingService } from "@/services/time-tracking.service";
import { logTimeSchema } from "@/lib/validations/time-tracking";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: issueId } = await params;
    const logs = await TimeTrackingService.getTimeLogs(
      tenant.organizationId,
      issueId,
    );

    return apiSuccess(logs);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to get time logs",
      error.code || "SERVER_ERROR",
      error.statusCode || 500,
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: issueId } = await params;
    const body = await req.json();
    const parsed = logTimeSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const log = await TimeTrackingService.logTime(
      tenant.userId,
      tenant.organizationId,
      issueId,
      parsed.data,
    );

    return apiSuccess(log, 201);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to log time",
      error.code || "SERVER_ERROR",
      error.statusCode || 500,
    );
  }
}
