import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { organizationService } from "@/services/organization.service";
import { updateOrgSchema } from "@/lib/validations/org";
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
  // Allow test header in non-production
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
    const { id } = await params;
    const userId = await resolveUserId(req);
    if (!userId) return apiUnauthorized();

    const org = await organizationService.getOrganization(id, userId);
    return apiSuccess(org);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED") {
      return apiError(error.message, "ORG_ACCESS_DENIED", 403);
    }
    return apiError(
      "Failed to fetch organization",
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
    const { id } = await params;
    const userId = await resolveUserId(req);
    if (!userId) return apiUnauthorized();

    const body = await req.json();
    const parsed = updateOrgSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const updated = await organizationService.updateOrganization(
      id,
      userId,
      parsed.data,
    );
    return apiSuccess(updated);
  } catch (error: any) {
    if (error.code === "AUTH_FORBIDDEN") {
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    }
    return apiError(
      "Failed to update organization",
      "INTERNAL_SERVER_ERROR",
      500,
    );
  }
}
