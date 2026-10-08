import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import { epicService } from "@/services/epic.service";
import { createEpicSchema } from "@/lib/validations/epic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: projectId } = await params;
    const epics = await epicService.listProjectEpics(
      projectId,
      tenant.organizationId,
      tenant.userId,
    );

    return apiSuccess(epics);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to list epics",
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
    const parsed = createEpicSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const epic = await epicService.createEpic(
      projectId,
      tenant.organizationId,
      tenant.userId,
      parsed.data,
    );

    return apiSuccess(epic, 201);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to create epic",
      "SERVER_ERROR",
      500,
    );
  }
}
