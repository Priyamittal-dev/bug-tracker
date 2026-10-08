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
import { startSprintSchema } from "@/lib/validations/sprint";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const body = await req.json();
    const parsed = startSprintSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const started = await sprintService.startSprint(
      id,
      tenant.organizationId,
      tenant.userId,
      parsed.data,
    );

    return apiSuccess(started);
  } catch (error: any) {
    if (error.code === "SPRINT_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "ACTIVE_SPRINT_EXISTS")
      return apiError(error.message, "ACTIVE_SPRINT_EXISTS", 409);
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to start sprint",
      "SERVER_ERROR",
      500,
    );
  }
}
