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
import { changePlanSchema } from "@/lib/validations/billing";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiUnauthorized();
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();
    if (!canReadBilling(tenant.role)) return apiForbidden();
    const overview = await billingService.getOverview(tenant.organizationId);
    return apiSuccess(overview);
  } catch (error: any) {
    return apiError(
      error.message || "Failed to load billing",
      error.code || "INTERNAL_SERVER_ERROR",
      error.status || 500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiUnauthorized();
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();
    const body = await req.json();
    const parsed = changePlanSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation error", "VALIDATION_ERROR", 400);
    }
    const overview = await billingService.changePlan(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
      parsed.data,
    );
    return apiSuccess(overview);
  } catch (error: any) {
    return apiError(
      error.message || "Failed to change plan",
      error.code || "INTERNAL_SERVER_ERROR",
      error.status || 500,
    );
  }
}
