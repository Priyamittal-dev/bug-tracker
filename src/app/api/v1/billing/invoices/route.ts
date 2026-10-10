import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantContext } from "@/lib/tenant";
import { canReadBilling } from "@/lib/rbac";
import { billingService } from "@/services/billing.service";
import {
  apiError,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiUnauthorized();
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();
    if (!canReadBilling(tenant.role) && !canReadBilling(tenant.userRole)) {
      return apiForbidden();
    }

    const overview = await billingService.getOverview(tenant.organizationId);
    return apiSuccess(overview.invoices);
  } catch (error: any) {
    return apiError(
      error.message || "Failed to load invoices",
      error.code || "INTERNAL_SERVER_ERROR",
      error.status || 500,
    );
  }
}
