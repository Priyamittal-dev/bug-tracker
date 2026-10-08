import { NextRequest } from "next/server";
import { registerSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth.service";
import { rateLimit } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limit = await rateLimit(`register:${ip}`, 5, 60);

    if (!limit.allowed) {
      return apiError(
        `Too many registration attempts. Please retry in ${limit.resetSeconds} seconds.`,
        "RATE_LIMIT_EXCEEDED",
        429,
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await authService.register(parsed.data);
    return apiSuccess(result, 201);
  } catch (error: any) {
    logger.error("Registration endpoint error", {
      event: "REGISTER_ERROR",
      errorCode: error.code || "INTERNAL_ERROR",
    });

    if (error.code === "USER_ALREADY_EXISTS") {
      return apiError(error.message, "USER_ALREADY_EXISTS", 409);
    }

    return apiError("Failed to register account", "INTERNAL_SERVER_ERROR", 500);
  }
}
