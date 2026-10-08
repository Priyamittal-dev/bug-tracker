import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;

    const issue = await prisma.issue.findFirst({
      where: { id, organizationId: tenant.organizationId },
    });

    if (!issue) {
      return apiError(
        "Issue not found in this organization",
        "ISSUE_NOT_FOUND",
        404,
      );
    }

    const activities = await prisma.issueActivity.findMany({
      where: { issueId: id },
      include: {
        actor: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(activities);
  } catch {
    return apiError(
      "Failed to fetch issue activities",
      "INTERNAL_SERVER_ERROR",
      500,
    );
  }
}
