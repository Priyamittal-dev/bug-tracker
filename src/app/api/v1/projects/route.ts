import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { projectService } from "@/services/project.service";
import { createProjectSchema } from "@/lib/validations/project";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;

    const projects = await projectService.listProjects(
      tenant.organizationId,
      tenant.userId,
      {
        search,
        status,
      },
    );

    return apiSuccess(projects);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED") {
      return apiError(error.message, "ORG_ACCESS_DENIED", 403);
    }
    return apiError("Failed to fetch projects", "INTERNAL_SERVER_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const project = await projectService.createProject(
      tenant.organizationId,
      tenant.userId,
      parsed.data,
    );
    return apiSuccess(project, 201);
  } catch (error: any) {
    if (error.code === "PROJECT_KEY_EXISTS") {
      return apiError(error.message, "PROJECT_KEY_EXISTS", 409);
    }
    if (error.code === "AUTH_FORBIDDEN") {
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    }
    return apiError("Failed to create project", "INTERNAL_SERVER_ERROR", 500);
  }
}
