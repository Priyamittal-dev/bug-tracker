import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantContext } from "@/lib/tenant";
import { changePlanSchema } from "@/lib/validations/billing";
import {
  apiError,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api-response";
import { createStripeCheckoutSession } from "@/lib/billing/stripe-provider";
import { PLAN_CATALOG } from "@/lib/billing/plans";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiUnauthorized();
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return apiError("Invalid JSON request body", "INVALID_JSON", 400);
    }
    const parsed = changePlanSchema.safeParse(input);
    if (!parsed.success) {
      return apiError("Invalid plan selection", "VALIDATION_ERROR", 400);
    }
    const result = await createStripeCheckoutSession({
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      role: tenant.role,
      planKey: parsed.data.planKey,
      billingInterval: parsed.data.billingInterval,
      seatQuantity:
        parsed.data.seatQuantity ??
        PLAN_CATALOG[parsed.data.planKey].includedSeats,
    });
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof Error && "code" in error && "status" in error) {
      return apiError(
        error.message,
        String(error.code),
        Number(error.status),
      );
    }
    logger.error("Stripe Checkout session creation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return apiError("Failed to start Stripe Checkout", "INTERNAL_SERVER_ERROR", 500);
  }
}
