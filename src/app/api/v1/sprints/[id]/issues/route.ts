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
import { sprintIssueBulkSchema } from "@/lib/validations/sprint";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const body = await req.json();
    const parsed = sprintIssueBulkSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await sprintService.addIssuesToSprint(
      id,
      tenant.organizationId,
      tenant.userId,
      parsed.data.issueIds,
    );

    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "SPRINT_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to add issues to sprint",
      "SERVER_ERROR",
      500,
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const body = await req.json();
    const parsed = sprintIssueBulkSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await sprintService.removeIssuesFromSprint(
      id,
      tenant.organizationId,
      tenant.userId,
      parsed.data.issueIds,
    );

    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "SPRINT_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to remove issues from sprint",
      "SERVER_ERROR",
      500,
    );
  }
}
