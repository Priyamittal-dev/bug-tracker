import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { organizationService } from "@/services/organization.service";
import { inviteMemberSchema, updateRoleSchema } from "@/lib/validations/org";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    return user?.id || null;
  }
  if (process.env.NODE_ENV !== "production") {
    const testUserId = req.headers.get("x-user-id");
    if (testUserId) return testUserId;
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: organizationId } = await params;
    const userId = await resolveUserId(req);
    if (!userId) return apiUnauthorized();

    const data = await organizationService.getOrganizationMembers(
      organizationId,
      userId,
    );
    return apiSuccess(data);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED") {
      return apiError(error.message, "ORG_ACCESS_DENIED", 403);
    }
    return apiError(
      "Failed to fetch organization members",
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
    const { id: organizationId } = await params;
    const userId = await resolveUserId(req);
    if (!userId) return apiUnauthorized();

    const body = await req.json();
    const parsed = inviteMemberSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await organizationService.inviteMember(
      organizationId,
      userId,
      parsed.data,
    );
    return apiSuccess(result, 201);
  } catch (error: any) {
    if (error.code === "AUTH_FORBIDDEN") {
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    }
    if (error.code === "ALREADY_MEMBER") {
      return apiError(error.message, "ALREADY_MEMBER", 400);
    }
    return apiError("Failed to invite member", "INTERNAL_SERVER_ERROR", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: organizationId } = await params;
    const userId = await resolveUserId(req);
    if (!userId) return apiUnauthorized();

    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const updated = await organizationService.updateMemberRole(
      organizationId,
      userId,
      parsed.data,
    );
    return apiSuccess(updated);
  } catch (error: any) {
    if (error.code === "AUTH_FORBIDDEN") {
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    }
    if (error.code === "LAST_OWNER_PROTECTION") {
      return apiError(error.message, "LAST_OWNER_PROTECTION", 400);
    }
    if (error.code === "MEMBER_NOT_FOUND") {
      return apiError(error.message, "MEMBER_NOT_FOUND", 404);
    }
    return apiError(
      "Failed to update member role",
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
    const { id: organizationId } = await params;
    const userId = await resolveUserId(req);
    if (!userId) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return apiError(
        "userId query parameter required",
        "VALIDATION_ERROR",
        400,
      );
    }

    await organizationService.removeMember(
      organizationId,
      userId,
      targetUserId,
    );
    return apiSuccess({ message: "Member removed successfully" });
  } catch (error: any) {
    if (error.code === "AUTH_FORBIDDEN") {
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    }
    if (error.code === "LAST_OWNER_PROTECTION") {
      return apiError(error.message, "LAST_OWNER_PROTECTION", 400);
    }
    return apiError("Failed to remove member", "INTERNAL_SERVER_ERROR", 500);
  }
}
