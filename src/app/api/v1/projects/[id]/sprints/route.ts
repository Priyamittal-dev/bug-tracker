import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import { sprintService } from "@/services/sprint.service";
import { createSprintSchema } from "@/lib/validations/sprint";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const sprints = await sprintService.listProjectSprints(
      projectId,
      tenant.organizationId,
      tenant.userId,
      status,
    );

    return apiSuccess(sprints);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to list sprints",
      "SERVER_ERROR",
      500,
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

    const { id: projectId } = await params;
    const body = await req.json();
    const parsed = createSprintSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const sprint = await sprintService.createSprint(
      projectId,
      tenant.organizationId,
      tenant.userId,
      parsed.data,
    );

    return apiSuccess(sprint, 201);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to create sprint",
      "SERVER_ERROR",
      500,
    );
  }
}
