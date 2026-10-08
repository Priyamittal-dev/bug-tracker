import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { projectService } from "@/services/project.service";
import { updateProjectSchema } from "@/lib/validations/project";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const project = await projectService.getProject(
      id,
      tenant.organizationId,
      tenant.userId,
    );
    return apiSuccess(project);
  } catch (error: any) {
    if (error.code === "PROJECT_NOT_FOUND")
      return apiError(error.message, "PROJECT_NOT_FOUND", 404);
    if (error.code === "AUTH_FORBIDDEN")
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    if (error.code === "ORG_ACCESS_DENIED")
      return apiError(error.message, "ORG_ACCESS_DENIED", 403);
    return apiError("Failed to fetch project", "INTERNAL_SERVER_ERROR", 500);
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
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const updated = await projectService.updateProject(
      id,
      tenant.organizationId,
      tenant.userId,
      parsed.data,
    );
    return apiSuccess(updated);
  } catch (error: any) {
    if (error.code === "PROJECT_NOT_FOUND")
      return apiError(error.message, "PROJECT_NOT_FOUND", 404);
    if (error.code === "AUTH_FORBIDDEN")
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    return apiError("Failed to update project", "INTERNAL_SERVER_ERROR", 500);
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
    const result = await projectService.deleteProject(
      id,
      tenant.organizationId,
      tenant.userId,
    );
    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "PROJECT_NOT_FOUND")
      return apiError(error.message, "PROJECT_NOT_FOUND", 404);
    if (error.code === "AUTH_FORBIDDEN")
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    return apiError("Failed to delete project", "INTERNAL_SERVER_ERROR", 500);
  }
}
