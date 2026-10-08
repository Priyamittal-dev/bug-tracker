import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { authService } from "@/services/auth.service";
import { apiSuccess, apiUnauthorized, apiNotFound } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id && !session?.user?.email) {
    return apiUnauthorized("You must be logged in to view your profile");
  }

  const userId = session.user.id;
  let profile = userId ? await authService.getUserProfile(userId) : null;

  if (!profile && session.user.email) {
    const user = (await authService.verifyCredentials) as any;
    // Fallback lookup by email
    const { prisma } = await import("@/lib/prisma");
    const found = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });
    if (found) {
      profile = found as any;
    }
  }

  if (!profile) {
    return apiNotFound("User profile not found");
  }

  return apiSuccess(profile);
}
