import { NextRequest } from "next/server";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth.service";
import { rateLimit } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limit = await rateLimit(`reset-pass:${ip}`, 5, 60);

    if (!limit.allowed) {
      return apiError(
        `Too many password reset attempts. Please retry in ${limit.resetSeconds} seconds.`,
        "RATE_LIMIT_EXCEEDED",
        429,
      );
    }

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    await authService.resetPassword(parsed.data);

    return apiSuccess({
      message:
        "Password reset successfully. You can now log in with your new credentials.",
    });
  } catch (error: any) {
    if (error.code === "INVALID_RESET_TOKEN") {
      return apiError(error.message, "INVALID_RESET_TOKEN", 400);
    }
    return apiError("Failed to reset password", "INTERNAL_SERVER_ERROR", 500);
  }
}
