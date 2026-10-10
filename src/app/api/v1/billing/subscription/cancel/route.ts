import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantContext } from "@/lib/tenant";
import { billingService } from "@/services/billing.service";
import {
  apiError,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api-response";
import { cancelSubscriptionSchema } from "@/lib/validations/billing";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiUnauthorized();
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const body = await req.json().catch(() => ({}));
    const parsed = cancelSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message || "Validation error",
        "VALIDATION_ERROR",
        400,
      );
    }

    const overview = await billingService.cancelSubscription(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
      parsed.data,
    );

    return apiSuccess(overview);
  } catch (error: any) {
    return apiError(
      error.message || "Failed to cancel subscription",
      error.code || "INTERNAL_SERVER_ERROR",
      error.status || 500,
    );
  }
}
