import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { teamService } from "@/services/team.service";
import { createTeamSchema } from "@/lib/validations/team";
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

    const teams = await teamService.getOrganizationTeams(
      organizationId,
      userId,
    );
    return apiSuccess(teams);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED") {
      return apiError(error.message, "ORG_ACCESS_DENIED", 403);
    }
    return apiError("Failed to fetch teams", "INTERNAL_SERVER_ERROR", 500);
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
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const team = await teamService.createTeam(
      organizationId,
      userId,
      parsed.data,
    );
    return apiSuccess(team, 201);
  } catch (error: any) {
    if (error.code === "AUTH_FORBIDDEN") {
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    }
    return apiError("Failed to create team", "INTERNAL_SERVER_ERROR", 500);
  }
}
