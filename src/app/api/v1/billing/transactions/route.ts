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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiUnauthorized();
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();
    if (!canReadBilling(tenant.role) && !canReadBilling(tenant.userRole)) {
      return apiForbidden();
    }

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || undefined;
    const limit = Number(searchParams.get("limit")) || 50;

    const transactions = await billingService.getTransactions(
      tenant.organizationId,
      { status, limit },
    );

    return apiSuccess(transactions);
  } catch (error: any) {
    return apiError(
      error.message || "Failed to load transactions",
      error.code || "INTERNAL_SERVER_ERROR",
      error.status || 500,
    );
  }
}
