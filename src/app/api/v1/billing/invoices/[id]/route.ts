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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiUnauthorized();
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();
    if (!canReadBilling(tenant.role) && !canReadBilling(tenant.userRole)) {
      return apiForbidden();
    }

    const params = await context.params;
    const invoice = await billingService.getInvoice(
      tenant.organizationId,
      params.id,
    );

    return apiSuccess(invoice);
  } catch (error: any) {
    return apiError(
      error.message || "Invoice not found",
      error.code || "NOT_FOUND",
      error.status || 404,
    );
  }
}
