import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import {
  handleStripeWebhook,
  StripeBillingError,
} from "@/lib/billing/stripe-provider";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return apiError("Missing Stripe signature", "INVALID_SIGNATURE", 400);
  }

  const rawBody = await request.text();
  try {
    const result = await handleStripeWebhook(rawBody, signature);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof StripeBillingError) {
      return apiError(error.message, error.code, error.status);
    }
    if (
      error instanceof Error &&
      "type" in error &&
      error.type === "StripeSignatureVerificationError"
    ) {
      return apiError("Invalid Stripe signature", "INVALID_SIGNATURE", 400);
    }
    logger.error("Stripe webhook processing failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return apiError("Stripe webhook processing failed", "WEBHOOK_FAILED", 500);
  }
}
