import { auth } from "@/auth";
import { getTenantContext } from "@/lib/tenant";
import {
  apiError,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api-response";
import { createStripePortalSession } from "@/lib/billing/stripe-provider";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) return apiUnauthorized();
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();
    return apiSuccess(
      await createStripePortalSession({
        organizationId: tenant.organizationId,
        role: tenant.role,
      }),
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && "status" in error) {
      return apiError(
        error.message,
        String(error.code),
        Number(error.status),
      );
    }
    logger.error("Stripe billing portal session creation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return apiError("Failed to open Stripe billing portal", "INTERNAL_SERVER_ERROR", 500);
  }
}
