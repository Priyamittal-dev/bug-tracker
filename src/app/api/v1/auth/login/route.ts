import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth.service";
import { rateLimit } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limit = await rateLimit(`login:${ip}`, 5, 60);

    if (!limit.allowed) {
      return apiError(
        `Too many login attempts. Please retry in ${limit.resetSeconds} seconds.`,
        "RATE_LIMIT_EXCEEDED",
        429,
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const user = await authService.verifyCredentials(parsed.data);
    if (!user) {
      return apiError(
        "Invalid email or password",
        "AUTH_INVALID_CREDENTIALS",
        401,
      );
    }

    const defaultOrg = user.memberships[0] || null;

    const response = apiSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        jobTitle: user.jobTitle,
        status: user.status,
      },
      memberships: user.memberships,
      activeOrganization: defaultOrg,
    });

    if (defaultOrg) {
      response.cookies.set("active_org_id", defaultOrg.organizationId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  } catch (error: any) {
    logger.error("Login endpoint error", {
      event: "LOGIN_ERROR",
      errorCode: error.code || "INTERNAL_ERROR",
      errorMessage: error.message,
    });

    if (error.code === "ACCOUNT_SUSPENDED") {
      return apiError(error.message, "ACCOUNT_SUSPENDED", 403);
    }

    return apiError("Authentication failed", "INTERNAL_SERVER_ERROR", 500);
  }
}
