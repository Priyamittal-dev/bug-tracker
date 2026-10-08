import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { changePasswordSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth.service";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email && !session?.user?.id) {
      return apiUnauthorized("You must be logged in to update your password");
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    let userId = session.user.id;
    if (!userId) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email! },
      });
      if (!user) return apiUnauthorized("User not found");
      userId = user.id;
    }

    const result = await authService.changePassword(
      userId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );

    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "INVALID_CURRENT_PASSWORD") {
      return apiError(
        "Current password is incorrect",
        "INVALID_CURRENT_PASSWORD",
        400,
      );
    }
    return apiError("Failed to update password", "INTERNAL_SERVER_ERROR", 500);
  }
}
