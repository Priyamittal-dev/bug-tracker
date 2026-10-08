import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth.service";
import { rateLimit } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limit = await rateLimit(`forgot-pass:${ip}`, 3, 60);

    if (!limit.allowed) {
      return apiError(
        `Too many password reset requests. Please retry in ${limit.resetSeconds} seconds.`,
        "RATE_LIMIT_EXCEEDED",
        429,
      );
    }

    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await authService.requestPasswordReset(parsed.data);

    return apiSuccess({
      message:
        "If an account with that email exists, password reset instructions have been dispatched.",
      ...(result.resetToken ? { debugResetToken: result.resetToken } : {}),
    });
  } catch (error: any) {
    return apiError(
      "Unable to process password reset request",
      "INTERNAL_SERVER_ERROR",
      500,
    );
  }
}
