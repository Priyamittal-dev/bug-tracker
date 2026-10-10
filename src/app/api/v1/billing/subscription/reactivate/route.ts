import { auth } from "@/auth";
import { getTenantContext } from "@/lib/tenant";
import { billingService } from "@/services/billing.service";
import {
  apiError,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api-response";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) return apiUnauthorized();
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const overview = await billingService.reactivateSubscription(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
    );

    return apiSuccess(overview);
  } catch (error: any) {
    return apiError(
      error.message || "Failed to reactivate subscription",
      error.code || "INTERNAL_SERVER_ERROR",
      error.status || 500,
    );
  }
}
