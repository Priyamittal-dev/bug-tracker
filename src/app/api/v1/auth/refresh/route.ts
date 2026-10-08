import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/api-response";
import { getTenantContext } from "@/lib/tenant";
import { logger } from "@/lib/logger";

export async function POST(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id && !session?.user?.email) {
      return apiUnauthorized("Active session required to refresh tokens");
    }

    const user = await prisma.user.findFirst({
      where: session.user.id
        ? { id: session.user.id }
        : { email: session.user.email! },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      return apiUnauthorized("User not found");
    }

    if (user.status === "SUSPENDED") {
      return apiError("Account suspended", "ACCOUNT_SUSPENDED", 403);
    }

    // Refresh last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tenant = await getTenantContext();

    logger.info("Session refreshed", {
      event: "SESSION_REFRESH",
      userId: user.id,
    });

    const response = apiSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        jobTitle: user.jobTitle,
        status: user.status,
        emailVerified: user.emailVerified,
      },
      memberships: user.memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        organizationSlug: m.organization.slug,
        role: m.role,
      })),
      activeOrganization:
        tenant?.organization ||
        (user.memberships[0] ? user.memberships[0].organization : null),
    });

    return response;
  } catch (error: any) {
    logger.error("Session refresh error", {
      event: "REFRESH_ERROR",
      errorCode: error.code,
    });
    return apiError("Failed to refresh session", "INTERNAL_SERVER_ERROR", 500);
  }
}
