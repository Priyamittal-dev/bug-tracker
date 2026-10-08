import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { projectService } from "@/services/project.service";
import {
  addProjectMemberSchema,
  updateProjectMemberRoleSchema,
} from "@/lib/validations/project";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const members = await projectService.getProjectMembers(
      id,
      tenant.organizationId,
      tenant.userId,
    );
    return apiSuccess(members);
  } catch (error: any) {
    if (error.code === "AUTH_FORBIDDEN")
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    return apiError(
      "Failed to fetch project members",
      "INTERNAL_SERVER_ERROR",
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

    const { id } = await params;
    const body = await req.json();
    const parsed = addProjectMemberSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const member = await projectService.addProjectMember(
      id,
      tenant.organizationId,
      tenant.userId,
      parsed.data,
    );
    return apiSuccess(member, 201);
  } catch (error: any) {
    if (error.code === "ALREADY_PROJECT_MEMBER")
      return apiError(error.message, "ALREADY_PROJECT_MEMBER", 400);
    if (error.code === "USER_NOT_IN_ORG")
      return apiError(error.message, "USER_NOT_IN_ORG", 400);
    if (error.code === "AUTH_FORBIDDEN")
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    return apiError(
      "Failed to add project member",
      "INTERNAL_SERVER_ERROR",
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
    const parsed = updateProjectMemberRoleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    if (!body.userId) {
      return apiError("User ID is required", "VALIDATION_ERROR", 400);
    }

    const updated = await projectService.updateProjectMemberRole(
      id,
      tenant.organizationId,
      tenant.userId,
      body.userId,
      parsed.data.role,
    );
    return apiSuccess(updated);
  } catch (error: any) {
    if (error.code === "MEMBER_NOT_FOUND")
      return apiError(error.message, "MEMBER_NOT_FOUND", 404);
    if (error.code === "AUTH_FORBIDDEN")
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    return apiError(
      "Failed to update project member role",
      "INTERNAL_SERVER_ERROR",
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
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return apiError("Target userId is required", "VALIDATION_ERROR", 400);
    }

    const result = await projectService.removeProjectMember(
      id,
      tenant.organizationId,
      tenant.userId,
      targetUserId,
    );
    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "MEMBER_NOT_FOUND")
      return apiError(error.message, "MEMBER_NOT_FOUND", 404);
    if (error.code === "AUTH_FORBIDDEN")
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    return apiError(
      "Failed to remove project member",
      "INTERNAL_SERVER_ERROR",
      500,
    );
  }
}
