import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantContext } from "@/lib/tenant";
import { billingService } from "@/services/billing.service";
import {
  apiError,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api-response";
import { voidInvoiceSchema } from "@/lib/validations/billing";

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
    const parsed = voidInvoiceSchema.safeParse({
      invoiceId: params.id,
      reason: body.reason,
    });

    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message || "Validation error",
        "VALIDATION_ERROR",
        400,
      );
    }

    const voided = await billingService.voidInvoice(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
      parsed.data,
    );

    return apiSuccess(voided);
  } catch (error: any) {
    return apiError(
      error.message || "Failed to void invoice",
      error.code || "INTERNAL_SERVER_ERROR",
      error.status || 500,
    );
  }
}
