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
import { updateSprintSchema } from "@/lib/validations/sprint";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const sprint = await sprintService.getSprint(
      id,
      tenant.organizationId,
      tenant.userId,
    );

    return apiSuccess(sprint);
  } catch (error: any) {
    if (error.code === "SPRINT_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to fetch sprint",
      "SERVER_ERROR",
      500,
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSprintSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const updated = await sprintService.updateSprint(
      id,
      tenant.organizationId,
      tenant.userId,
      parsed.data,
    );

    return apiSuccess(updated);
  } catch (error: any) {
    if (error.code === "SPRINT_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to update sprint",
      "SERVER_ERROR",
      500,
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const result = await sprintService.deleteSprint(
      id,
      tenant.organizationId,
      tenant.userId,
    );

    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "SPRINT_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to delete sprint",
      "SERVER_ERROR",
      500,
    );
  }
}
