"use server";

import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/tenant";
import { canReadBilling } from "@/lib/rbac";
import { billingService } from "@/services/billing.service";
import {
  addPaymentMethodSchema,
  changePlanSchema,
  updateBillingProfileSchema,
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
    return { ok: false as const, error: error.message || "Failed to add method" };
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

export async function payInvoiceAction(invoiceId: string) {
  const tenant = await requireTenantContext();
  try {
    await billingService.payInvoice(
      tenant.organizationId,
      tenant.role,
      invoiceId,
    );
    revalidatePath("/settings/billing");
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, error: error.message };
  }
}

export async function requireBillingAdmin() {
  const tenant = await requireTenantContext();
  if (!canReadBilling(tenant.role)) forbidden();
  return tenant;
}
