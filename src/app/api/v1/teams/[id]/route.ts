import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { teamService } from "@/services/team.service";
import { updateTeamSchema } from "@/lib/validations/team";
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: teamId } = await params;
    const userId = await resolveUserId(req);
    if (!userId) return apiUnauthorized();

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return apiNotFound("Team not found");

    const result = await teamService.getTeamById(
      teamId,
      team.organizationId,
      userId,
    );
    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED") {
      return apiError(error.message, "ORG_ACCESS_DENIED", 403);
    }
    if (error.code === "TEAM_NOT_FOUND") {
      return apiNotFound(error.message);
    }
    return apiError("Failed to fetch team", "INTERNAL_SERVER_ERROR", 500);
  }
}

export async function PATCH(
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
    const parsed = updateTeamSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const updated = await teamService.updateTeam(
      teamId,
      team.organizationId,
      userId,
      parsed.data,
    );
    return apiSuccess(updated);
  } catch (error: any) {
    if (error.code === "AUTH_FORBIDDEN") {
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    }
    if (error.code === "TEAM_NOT_FOUND") {
      return apiNotFound(error.message);
    }
    return apiError("Failed to update team", "INTERNAL_SERVER_ERROR", 500);
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

    await teamService.deleteTeam(teamId, team.organizationId, userId);
    return apiSuccess({ message: "Team deleted successfully" });
  } catch (error: any) {
    if (error.code === "AUTH_FORBIDDEN") {
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    }
    if (error.code === "TEAM_NOT_FOUND") {
      return apiNotFound(error.message);
    }
    return apiError("Failed to delete team", "INTERNAL_SERVER_ERROR", 500);
  }
}
