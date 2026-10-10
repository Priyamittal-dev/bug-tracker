import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantContext } from "@/lib/tenant";
import { billingService } from "@/services/billing.service";
import {
  apiError,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api-response";
import { addPaymentMethodSchema } from "@/lib/validations/billing";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiUnauthorized();
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();
    const body = await req.json();
    const parsed = addPaymentMethodSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten(),
      );
    }
    const method = await billingService.addPaymentMethod(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
      parsed.data,
    );
    return apiSuccess(
      {
        id: method.id,
        type: method.type,
        brand: method.brand,
        last4: method.last4,
        isDefault: method.isDefault,
      },
      201,
    );
  } catch (error: any) {
    return apiError(
      error.message || "Failed to add payment method",
      error.code || "INTERNAL_SERVER_ERROR",
      error.status || 500,
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiUnauthorized();
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return apiError("Payment method id required", "VALIDATION_ERROR");
    await billingService.removePaymentMethod(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
      id,
    );
    return apiSuccess({ ok: true });
  } catch (error: any) {
    return apiError(
      error.message || "Failed to remove payment method",
      error.code || "INTERNAL_SERVER_ERROR",
      error.status || 500,
    );
  }
}
