import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantContext } from "@/lib/tenant";
import { billingService } from "@/services/billing.service";
import {
  apiError,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiUnauthorized();
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const params = await context.params;
    const body = await req.json().catch(() => ({}));

    const invoice = await billingService.payInvoice(
      tenant.organizationId,
      tenant.role,
      params.id,
      body.paymentMethodId,
    );

    return apiSuccess(invoice);
  } catch (error: any) {
    return apiError(
      error.message || "Failed to pay invoice",
      error.code || "INTERNAL_SERVER_ERROR",
      error.status || 500,
    );
  }
}
