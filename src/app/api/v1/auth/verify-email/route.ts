import { NextRequest } from "next/server";
import { verifyEmailSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth.service";
import { rateLimit } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limit = await rateLimit(`verify-email:${ip}`, 10, 60);

    if (!limit.allowed) {
      return apiError(
        `Too many verification attempts. Please retry in ${limit.resetSeconds} seconds.`,
        "RATE_LIMIT_EXCEEDED",
        429,
      );
    }

    const body = await req.json();
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await authService.verifyEmail(
      parsed.data.token,
      parsed.data.email,
    );
    return apiSuccess(result);
  } catch (error: any) {
    logger.error("Verify email error", {
      event: "VERIFY_EMAIL_ERROR",
      errorCode: error.code || "INTERNAL_ERROR",
    });

    if (error.code === "INVALID_VERIFICATION_TOKEN") {
      return apiError(error.message, "INVALID_VERIFICATION_TOKEN", 400);
    }

    return apiError("Failed to verify email", "INTERNAL_SERVER_ERROR", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email") || undefined;

    if (!token) {
      return apiError(
        "Verification token is required",
        "VALIDATION_ERROR",
        400,
      );
    }

    const result = await authService.verifyEmail(token, email);
    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "INVALID_VERIFICATION_TOKEN") {
      return apiError(error.message, "INVALID_VERIFICATION_TOKEN", 400);
    }
    return apiError("Failed to verify email", "INTERNAL_SERVER_ERROR", 500);
  }
}
