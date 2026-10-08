import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { teamService } from "@/services/team.service";
import { addTeamMemberSchema } from "@/lib/validations/team";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiNotFound,
} from "@/lib/api-response";
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: teamId } = await params;
    const userId = await resolveUserId(req);
    if (!userId) return apiUnauthorized();

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return apiNotFound("Team not found");

    const body = await req.json();
    const parsed = addTeamMemberSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const member = await teamService.addTeamMember(
      teamId,
      team.organizationId,
      userId,
      parsed.data,
    );
    return apiSuccess(member, 201);
  } catch (error: any) {
    if (error.code === "AUTH_FORBIDDEN") {
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    }
    if (error.code === "ALREADY_TEAM_MEMBER") {
      return apiError(error.message, "ALREADY_TEAM_MEMBER", 400);
    }
    if (error.code === "USER_NOT_IN_ORG") {
      return apiError(error.message, "USER_NOT_IN_ORG", 400);
    }
    return apiError("Failed to add team member", "INTERNAL_SERVER_ERROR", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: teamId } = await params;
    const userId = await resolveUserId(req);
    if (!userId) return apiUnauthorized();

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return apiNotFound("Team not found");

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return apiError(
        "userId query parameter required",
        "VALIDATION_ERROR",
        400,
      );
    }

    await teamService.removeTeamMember(
      teamId,
      team.organizationId,
      userId,
      targetUserId,
    );
    return apiSuccess({ message: "Team member removed successfully" });
  } catch (error: any) {
    if (error.code === "AUTH_FORBIDDEN") {
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    }
    if (error.code === "TEAM_MEMBER_NOT_FOUND") {
      return apiNotFound(error.message);
    }
    return apiError(
      "Failed to remove team member",
      "INTERNAL_SERVER_ERROR",
      500,
    );
  }
}
