"use server";

import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/tenant";
import { canReadBilling } from "@/lib/rbac";
import { billingService } from "@/services/billing.service";
import {
  addPaymentMethodSchema,
  cancelSubscriptionSchema,
  changePlanSchema,
  payInvoiceSchema,
  refundTransactionSchema,
  updateBillingProfileSchema,
  voidInvoiceSchema,
} from "@/lib/validations/billing";

function forbidden(): never {
  throw new Error("You do not have permission to manage billing");
}

export async function getBillingOverview() {
  const tenant = await requireTenantContext();
  if (!canReadBilling(tenant.role) && !canReadBilling(tenant.userRole)) {
    return null;
  }
  return billingService.getOverview(tenant.organizationId);
}

export async function addPaymentMethodAction(input: unknown) {
  const tenant = await requireTenantContext();
  const parsed = addPaymentMethodSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || "Invalid payment method",
    };
  }
  try {
    await billingService.addPaymentMethod(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
      parsed.data,
    );
    revalidatePath("/settings/billing");
    return { ok: true as const };
  } catch (error: any) {
    return {
      ok: false as const,
      error: error.message || "Failed to add method",
    };
  }
}

export async function removePaymentMethodAction(paymentMethodId: string) {
  const tenant = await requireTenantContext();
  try {
    await billingService.removePaymentMethod(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
      paymentMethodId,
    );
    revalidatePath("/settings/billing");
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, error: error.message };
  }
}

export async function setDefaultPaymentMethodAction(paymentMethodId: string) {
  const tenant = await requireTenantContext();
  try {
    await billingService.setDefaultPaymentMethod(
      tenant.organizationId,
      tenant.role,
      paymentMethodId,
    );
    revalidatePath("/settings/billing");
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, error: error.message };
  }
}

export async function changePlanAction(input: unknown) {
  const tenant = await requireTenantContext();
  const parsed = changePlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid plan selection" };
  }
  try {
    await billingService.changePlan(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
      parsed.data,
    );
    revalidatePath("/settings/billing");
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, error: error.message };
  }
}

export async function updateBillingProfileAction(input: unknown) {
  const tenant = await requireTenantContext();
  const parsed = updateBillingProfileSchema.safeParse(
    Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ]),
    ),
  );
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid billing profile" };
  }
  try {
    await billingService.updateProfile(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
      parsed.data,
    );
    revalidatePath("/settings/billing");
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, error: error.message };
  }
}

export async function payInvoiceAction(invoiceId: string, paymentMethodId?: string) {
  const tenant = await requireTenantContext();
  const parsed = payInvoiceSchema.safeParse({ invoiceId, paymentMethodId });
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid invoice payment parameters" };
  }
  try {
    await billingService.payInvoice(
      tenant.organizationId,
      tenant.role,
      parsed.data.invoiceId,
      parsed.data.paymentMethodId,
    );
    revalidatePath("/settings/billing");
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, error: error.message };
  }
}

export async function voidInvoiceAction(invoiceId: string, reason?: string) {
  const tenant = await requireTenantContext();
  const parsed = voidInvoiceSchema.safeParse({ invoiceId, reason });
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid void request" };
  }
  try {
    await billingService.voidInvoice(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
      parsed.data,
    );
    revalidatePath("/settings/billing");
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, error: error.message };
  }
}

export async function refundTransactionAction(
  transactionId: string,
  amountCents?: number,
  reason?: string,
) {
  const tenant = await requireTenantContext();
  const parsed = refundTransactionSchema.safeParse({
    transactionId,
    amountCents,
    reason,
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid refund parameters" };
  }
  try {
    await billingService.refundTransaction(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
      parsed.data,
    );
    revalidatePath("/settings/billing");
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, error: error.message };
  }
}

export async function cancelSubscriptionAction(
  cancelAtPeriodEnd = true,
  reason?: string,
) {
  const tenant = await requireTenantContext();
  const parsed = cancelSubscriptionSchema.safeParse({
    cancelAtPeriodEnd,
    reason,
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid cancellation request" };
  }
  try {
    await billingService.cancelSubscription(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
      parsed.data,
    );
    revalidatePath("/settings/billing");
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, error: error.message };
  }
}

export async function reactivateSubscriptionAction() {
  const tenant = await requireTenantContext();
  try {
    await billingService.reactivateSubscription(
      tenant.organizationId,
      tenant.role,
      tenant.userId,
    );
    revalidatePath("/settings/billing");
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, error: error.message };
  }
}

export async function getInvoiceAction(invoiceId: string) {
  const tenant = await requireTenantContext();
  if (!canReadBilling(tenant.role) && !canReadBilling(tenant.userRole)) {
    return null;
  }
  try {
    return await billingService.getInvoice(tenant.organizationId, invoiceId);
  } catch {
    return null;
  }
}

export async function getPaymentTransactionsAction(status?: string) {
  const tenant = await requireTenantContext();
  if (!canReadBilling(tenant.role) && !canReadBilling(tenant.userRole)) {
    return [];
  }
  return billingService.getTransactions(tenant.organizationId, { status });
}

export async function requireBillingAdmin() {
  const tenant = await requireTenantContext();
  if (!canReadBilling(tenant.role)) forbidden();
  return tenant;
}
