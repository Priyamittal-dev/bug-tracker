import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return apiUnauthorized();
    }

    const body = await req.json();
    const { organizationId } = body;

    if (!organizationId) {
      return apiError("organizationId is required", "MISSING_FIELD", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { memberships: true },
    });

    if (!user) return apiUnauthorized();

    // Validate that the user actually belongs to this organization (Tenant Isolation!)
    const hasMembership = user.memberships.some(
      (m) => m.organizationId === organizationId,
    );
    if (!hasMembership) {
      return apiForbidden("You are not a member of this organization");
    }

    const cookieStore = await cookies();
    cookieStore.set("active_org_id", organizationId, {
      path: "/",
      httpOnly: false, // Accessible to client-side switchers
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    const activeOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    return apiSuccess({
      activeOrganization: activeOrg,
    });
  } catch (error: any) {
    console.error("Switch org error:", error);
    return apiError(
      "Failed to switch organization",
      "INTERNAL_SERVER_ERROR",
      500,
    );
  }
}
