import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { logger } from "@/lib/logger";
import {
  PLAN_CATALOG,
  formatUsd,
  normalizePlanKey,
  quotePlan,
  type BillingInterval,
  type PlanKey,
} from "@/lib/billing/plans";
import {
  tokenizeBankAccount,
  tokenizeCard,
} from "@/lib/billing/tokenize";
import { sandboxGateway } from "@/lib/billing/sandbox-gateway";
import type {
  AddPaymentMethodInput,
  CancelSubscriptionInput,
  ChangePlanInput,
  PayInvoiceInput,
  RefundTransactionInput,
  UpdateBillingProfileInput,
  VoidInvoiceInput,
} from "@/lib/validations/billing";

function assertBillingManage(role: string) {
  if (!hasPermission(role, "billing.manage")) {
    const error: any = new Error(
      "You do not have permission to manage billing",
    );
    error.code = "FORBIDDEN";
    error.status = 403;
    throw error;
  }
}

function periodEnd(interval: BillingInterval, from = new Date()) {
  const end = new Date(from);
  if (interval === "YEARLY") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

function nextInvoiceNumber(orgSlug: string, seq: number) {
  const year = new Date().getFullYear();
  return `INV-${orgSlug.slice(0, 6).toUpperCase()}-${year}-${String(seq).padStart(4, "0")}`;
}

export class BillingService {
  async ensureAccount(organizationId: string, billingEmail: string) {
    const existing = await prisma.billingAccount.findUnique({
      where: { organizationId },
      include: { subscription: true },
    });
    if (existing) return existing;

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });
    const planKey = normalizePlanKey(org.plan);
    const start = new Date();

    return prisma.$transaction(async (tx) => {
      const account = await tx.billingAccount.create({
        data: {
          organizationId,
          billingEmail,
          companyName: org.name,
          currency: "USD",
          collectionMethod:
            planKey === "ENTERPRISE" ? "SEND_INVOICE" : "CHARGE_AUTOMATICALLY",
        },
      });

      await tx.subscription.create({
        data: {
          organizationId,
          billingAccountId: account.id,
          planKey,
          status: "ACTIVE",
          billingInterval: "MONTHLY",
          seatQuantity: PLAN_CATALOG[planKey].includedSeats,
          currentPeriodStart: start,
          currentPeriodEnd: periodEnd("MONTHLY", start),
        },
      });

      return tx.billingAccount.findUniqueOrThrow({
        where: { id: account.id },
        include: { subscription: true },
      });
    });
  }

  async getOverview(organizationId: string) {
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: {
        _count: {
          select: { memberships: true, projects: true },
        },
      },
    });

    const account = await this.ensureAccount(
      organizationId,
      "billing@" + org.slug + ".example",
    );

    const [paymentMethods, invoices, subscription, transactions] =
      await Promise.all([
        prisma.paymentMethod.findMany({
          where: { organizationId, status: { not: "REMOVED" } },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        }),
        prisma.invoice.findMany({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          take: 24,
          include: { paymentMethod: true, paymentTransactions: true },
        }),
        prisma.subscription.findUnique({ where: { organizationId } }),
        prisma.paymentTransaction.findMany({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { paymentMethod: true, invoice: true },
        }),
      ]);

    const planKey = normalizePlanKey(subscription?.planKey || org.plan);
    const interval = (subscription?.billingInterval ||
      "MONTHLY") as BillingInterval;
    const seats = subscription?.seatQuantity || org._count.memberships;
    const quote = quotePlan(planKey, interval, seats);

    const totalPaidCents = invoices
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amountPaidCents, 0);
    const openInvoicesCount = invoices.filter((i) => i.status === "OPEN").length;

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: planKey,
      },
      account,
      subscription,
      paymentMethods: paymentMethods.map((pm) => ({
        id: pm.id,
        type: pm.type,
        brand: pm.brand,
        last4: pm.last4,
        expMonth: pm.expMonth,
        expYear: pm.expYear,
        holderName: pm.holderName,
        bankName: pm.bankName,
        billingCountry: pm.billingCountry,
        isDefault: pm.isDefault,
        status: pm.status,
        createdAt: pm.createdAt,
      })),
      invoices: invoices.map((inv) => ({
        ...inv,
        lineItems: JSON.parse(inv.lineItemsJson || "[]"),
        paymentMethod: inv.paymentMethod
          ? {
              type: inv.paymentMethod.type,
              brand: inv.paymentMethod.brand,
              last4: inv.paymentMethod.last4,
            }
          : null,
      })),
      transactions: transactions.map((t) => ({
        id: t.id,
        amountCents: t.amountCents,
        currency: t.currency,
        status: t.status,
        type: t.type,
        gateway: t.gateway,
        gatewayTransactionId: t.gatewayTransactionId,
        gatewayResponseCode: t.gatewayResponseCode,
        failureReason: t.failureReason,
        refundedAmountCents: t.refundedAmountCents,
        description: t.description,
        createdAt: t.createdAt,
        invoiceNumber: t.invoice?.number || null,
        invoiceId: t.invoiceId,
        paymentMethod: t.paymentMethod
          ? {
              id: t.paymentMethod.id,
              type: t.paymentMethod.type,
              brand: t.paymentMethod.brand,
              last4: t.paymentMethod.last4,
            }
          : null,
      })),
      stats: {
        totalPaidCents,
        openInvoicesCount,
        activePaymentMethodsCount: paymentMethods.length,
        totalTransactionsCount: transactions.length,
      },
      usage: {
        seatsUsed: org._count.memberships,
        seatsIncluded: PLAN_CATALOG[planKey].includedSeats,
        seatsPurchased: seats,
        projectsUsed: org._count.projects,
        projectsLimit: PLAN_CATALOG[planKey].limits.projects,
      },
      quote,
      catalog: Object.values(PLAN_CATALOG),
    };
  }

  async updateProfile(
    organizationId: string,
    role: string,
    actorUserId: string,
    input: UpdateBillingProfileInput,
  ) {
    assertBillingManage(role);
    await this.ensureAccount(organizationId, input.billingEmail);
    const updated = await prisma.billingAccount.update({
      where: { organizationId },
      data: {
        billingEmail: input.billingEmail,
        companyName: input.companyName,
        taxId: input.taxId,
        taxIdType: input.taxIdType,
        addressLine1: input.addressLine1,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        country: input.country,
        collectionMethod: input.collectionMethod,
        poNumber: input.poNumber,
        netTermsDays: input.netTermsDays,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: "BILLING_PROFILE_UPDATED",
        resourceType: "BILLING_ACCOUNT",
        resourceId: updated.id,
        details: JSON.stringify({ billingEmail: input.billingEmail }),
      },
    });

    return updated;
  }

  async addPaymentMethod(
    organizationId: string,
    role: string,
    actorUserId: string,
    input: AddPaymentMethodInput,
  ) {
    assertBillingManage(role);
    const account = await this.ensureAccount(
      organizationId,
      "billing@workspace.local",
    );

    let tokenized: {
      type: string;
      brand?: string | null;
      last4: string;
      expMonth?: number;
      expYear?: number;
      holderName: string;
      bankName?: string | null;
      fingerprint: string;
    };

    if (input.type === "CARD") {
      tokenized = tokenizeCard({
        organizationId,
        pan: input.pan,
        cvc: input.cvc,
        expMonth: input.expMonth,
        expYear: input.expYear,
        holderName: input.holderName,
      });
    } else if (input.type === "ACH" || input.type === "SEPA_DEBIT") {
      tokenized = tokenizeBankAccount({
        organizationId,
        type: input.type,
        accountNumber: input.accountNumber,
        routingNumber: input.type === "ACH" ? input.routingNumber : undefined,
        iban: input.type === "SEPA_DEBIT" ? input.iban : undefined,
        holderName: input.holderName,
        bankName: input.bankName,
      });
    } else {
      tokenized = {
        type: input.type,
        brand: input.type === "WIRE" ? "bank" : "invoice",
        last4: input.poNumber.slice(-4),
        holderName: input.holderName,
        fingerprint: `${organizationId}:${input.type}:${input.poNumber}`,
      };
      await prisma.billingAccount.update({
        where: { id: account.id },
        data: {
          poNumber: input.poNumber,
          collectionMethod: "SEND_INVOICE",
        },
      });
    }

    const duplicate = await prisma.paymentMethod.findFirst({
      where: {
        organizationId,
        fingerprint: tokenized.fingerprint,
        status: { not: "REMOVED" },
      },
    });
    if (duplicate) {
      const error: any = new Error("This payment method is already on file");
      error.code = "PAYMENT_METHOD_EXISTS";
      error.status = 409;
      throw error;
    }

    const existingCount = await prisma.paymentMethod.count({
      where: { organizationId, status: { not: "REMOVED" } },
    });
    const makeDefault = Boolean(input.setDefault) || existingCount === 0;

    const method = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.paymentMethod.updateMany({
          where: { organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.paymentMethod.create({
        data: {
          organizationId,
          billingAccountId: account.id,
          type: tokenized.type,
          brand: tokenized.brand,
          last4: tokenized.last4,
          expMonth: tokenized.expMonth,
          expYear: tokenized.expYear,
          holderName: tokenized.holderName,
          bankName: tokenized.bankName,
          fingerprint: tokenized.fingerprint,
          billingCountry:
            "billingCountry" in input ? input.billingCountry : "US",
          isDefault: makeDefault,
          status: "ACTIVE",
        },
      });
    });

    logger.info("Payment method added", {
      event: "PAYMENT_METHOD_ADDED",
      organizationId,
      userId: actorUserId,
      details: { type: method.type, last4: method.last4, brand: method.brand },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: "PAYMENT_METHOD_ADDED",
        resourceType: "PAYMENT_METHOD",
        resourceId: method.id,
        details: JSON.stringify({ type: method.type, last4: method.last4 }),
      },
    });

    return method;
  }

  async setDefaultPaymentMethod(
    organizationId: string,
    role: string,
    paymentMethodId: string,
  ) {
    assertBillingManage(role);
    const method = await prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, organizationId, status: "ACTIVE" },
    });
    if (!method) {
      const error: any = new Error("Payment method not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await prisma.$transaction([
      prisma.paymentMethod.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.paymentMethod.update({
        where: { id: method.id },
        data: { isDefault: true },
      }),
    ]);

    return { ok: true };
  }

  async removePaymentMethod(
    organizationId: string,
    role: string,
    actorUserId: string,
    paymentMethodId: string,
  ) {
    assertBillingManage(role);
    const method = await prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, organizationId, status: { not: "REMOVED" } },
    });
    if (!method) {
      const error: any = new Error("Payment method not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const remaining = await prisma.paymentMethod.count({
      where: {
        organizationId,
        status: "ACTIVE",
        id: { not: method.id },
      },
    });
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (
      remaining === 0 &&
      subscription &&
      normalizePlanKey(subscription.planKey) !== "FREE"
    ) {
      const error: any = new Error(
        "Add another payment method before removing the last one on a paid plan",
      );
      error.code = "LAST_PAYMENT_METHOD";
      error.status = 409;
      throw error;
    }

    await prisma.paymentMethod.update({
      where: { id: method.id },
      data: { status: "REMOVED", isDefault: false },
    });

    if (method.isDefault && remaining > 0) {
      const next = await prisma.paymentMethod.findFirst({
        where: { organizationId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
      if (next) {
        await prisma.paymentMethod.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: "PAYMENT_METHOD_REMOVED",
        resourceType: "PAYMENT_METHOD",
        resourceId: method.id,
        details: JSON.stringify({ type: method.type, last4: method.last4 }),
      },
    });

    return { ok: true };
  }

  async changePlan(
    organizationId: string,
    role: string,
    actorUserId: string,
    input: ChangePlanInput,
  ) {
    assertBillingManage(role);
    const overview = await this.getOverview(organizationId);
    const planKey = input.planKey;
    const interval = input.billingInterval;
    const seats =
      input.seatQuantity ||
      overview.subscription?.seatQuantity ||
      overview.usage.seatsUsed;

    if (planKey !== "FREE") {
      const hasInstrument = overview.paymentMethods.some(
        (pm) => pm.status === "ACTIVE",
      );
      if (!hasInstrument) {
        const error: any = new Error(
          "Add a payment method before upgrading to a paid plan",
        );
        error.code = "PAYMENT_METHOD_REQUIRED";
        error.status = 400;
        throw error;
      }
    }

    const start = new Date();
    const quote = quotePlan(planKey, interval, seats);
    const account = overview.account;

    // First issue & collect invoice if paid, so invalid test card declines halt upgrade cleanly
    if (quote.subtotalCents > 0) {
      await this.issueAndCollectInvoice({
        organizationId,
        billingAccountId: account.id,
        orgSlug: overview.organization.slug,
        planKey,
        interval,
        seats,
        quote,
        actorUserId,
      });
    }

    const subscription = await prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        billingAccountId: account.id,
        planKey,
        status: "ACTIVE",
        billingInterval: interval,
        seatQuantity: seats,
        currentPeriodStart: start,
        currentPeriodEnd: periodEnd(interval, start),
      },
      update: {
        planKey,
        status: "ACTIVE",
        billingInterval: interval,
        seatQuantity: seats,
        currentPeriodStart: start,
        currentPeriodEnd: periodEnd(interval, start),
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    });

    await prisma.organization.update({
      where: { id: organizationId },
      data: { plan: planKey },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: "SUBSCRIPTION_CHANGED",
        resourceType: "SUBSCRIPTION",
        resourceId: subscription.id,
        details: JSON.stringify({ planKey, interval, seats }),
      },
    });

    return this.getOverview(organizationId);
  }

  private async issueAndCollectInvoice(params: {
    organizationId: string;
    billingAccountId: string;
    orgSlug: string;
    planKey: PlanKey;
    interval: BillingInterval;
    seats: number;
    quote: { subtotalCents: number; extraSeats: number; extraSeatCents: number };
    actorUserId: string;
  }) {
    const count = await prisma.invoice.count({
      where: { organizationId: params.organizationId },
    });
    const plan = PLAN_CATALOG[params.planKey];
    const defaultPm = await prisma.paymentMethod.findFirst({
      where: {
        organizationId: params.organizationId,
        isDefault: true,
        status: "ACTIVE",
      },
    });
    const account = await prisma.billingAccount.findUniqueOrThrow({
      where: { id: params.billingAccountId },
    });
    const taxRate =
      account.country === "US" || !account.country ? 0 : 0.2;
    const taxCents = Math.round(params.quote.subtotalCents * taxRate);
    const lineItems = [
      {
        description: `${plan.name} plan (${params.interval.toLowerCase()})`,
        quantity: 1,
        unitAmountCents:
          params.interval === "YEARLY" ? plan.yearlyCents : plan.monthlyCents,
      },
    ];
    if (params.quote.extraSeats > 0) {
      lineItems.push({
        description: `Additional seats (${params.quote.extraSeats})`,
        quantity: params.quote.extraSeats,
        unitAmountCents: Math.round(
          params.quote.extraSeatCents / params.quote.extraSeats,
        ),
      });
    }

    const collectNow =
      account.collectionMethod === "CHARGE_AUTOMATICALLY" &&
      defaultPm &&
      defaultPm.type !== "INVOICE" &&
      defaultPm.type !== "WIRE";

    const now = new Date();
    const due = new Date(now);
    due.setDate(due.getDate() + (collectNow ? 0 : account.netTermsDays));
    const totalCents = params.quote.subtotalCents + taxCents;

    let invoice = await prisma.invoice.create({
      data: {
        organizationId: params.organizationId,
        billingAccountId: params.billingAccountId,
        paymentMethodId: defaultPm?.id,
        number: nextInvoiceNumber(params.orgSlug, count + 1),
        status: "OPEN",
        currency: account.currency,
        subtotalCents: params.quote.subtotalCents,
        taxCents,
        totalCents,
        amountPaidCents: 0,
        periodStart: now,
        periodEnd: periodEnd(params.interval, now),
        dueDate: due,
        paidAt: null,
        lineItemsJson: JSON.stringify(lineItems),
        memo: collectNow
          ? `Pending authorization via ${defaultPm?.brand || defaultPm?.type} •••• ${defaultPm?.last4}`
          : `Net ${account.netTermsDays} · PO ${account.poNumber || "pending"}`,
      },
    });

    if (collectNow && defaultPm) {
      const chargeResult = await sandboxGateway.processCharge({
        organizationId: params.organizationId,
        billingAccountId: params.billingAccountId,
        invoiceId: invoice.id,
        paymentMethodId: defaultPm.id,
        amountCents: totalCents,
        currency: account.currency,
        description: `Subscription charge for ${plan.name} (${params.interval})`,
        paymentMethodType: defaultPm.type,
        last4: defaultPm.last4,
      });

      await prisma.paymentTransaction.create({
        data: {
          organizationId: params.organizationId,
          billingAccountId: params.billingAccountId,
          invoiceId: invoice.id,
          paymentMethodId: defaultPm.id,
          amountCents: totalCents,
          currency: account.currency,
          status: chargeResult.status,
          type: "CHARGE",
          gateway: sandboxGateway.gatewayName,
          gatewayTransactionId: chargeResult.gatewayTransactionId,
          gatewayResponseCode: chargeResult.gatewayResponseCode,
          failureReason: chargeResult.failureReason,
          description: `Subscription charge for ${plan.name} (${params.interval})`,
        },
      });

      if (chargeResult.success) {
        invoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "PAID",
            amountPaidCents: totalCents,
            paidAt: now,
            memo: `Charged to ${defaultPm.brand || defaultPm.type} •••• ${defaultPm.last4} (${chargeResult.gatewayTransactionId})`,
          },
        });
      } else {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            memo: `Payment failed: ${chargeResult.failureReason || "Declined"}`,
          },
        });
        const err: any = new Error(
          chargeResult.failureReason || "Payment processing failed in sandbox",
        );
        err.code = "PAYMENT_FAILED";
        err.status = 402;
        throw err;
      }
    }

    return invoice;
  }

  async payInvoice(
    organizationId: string,
    role: string,
    invoiceId: string,
    paymentMethodId?: string,
  ) {
    assertBillingManage(role);
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { billingAccount: true },
    });
    if (!invoice) {
      const error: any = new Error("Invoice not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }
    if (invoice.status === "PAID") return invoice;
    if (invoice.status === "VOID") {
      const error: any = new Error("Cannot pay a voided invoice");
      error.code = "INVOICE_VOID";
      error.status = 400;
      throw error;
    }

    const pm = paymentMethodId
      ? await prisma.paymentMethod.findFirst({
          where: { id: paymentMethodId, organizationId, status: "ACTIVE" },
        })
      : await prisma.paymentMethod.findFirst({
          where: { organizationId, isDefault: true, status: "ACTIVE" },
        });

    if (!pm) {
      const error: any = new Error("No active payment method on file");
      error.code = "PAYMENT_METHOD_REQUIRED";
      error.status = 400;
      throw error;
    }

    const amountToPay = invoice.totalCents - invoice.amountPaidCents;
    const chargeResult = await sandboxGateway.processCharge({
      organizationId,
      billingAccountId: invoice.billingAccountId,
      invoiceId: invoice.id,
      paymentMethodId: pm.id,
      amountCents: amountToPay,
      currency: invoice.currency,
      description: `Payment for Invoice ${invoice.number}`,
      paymentMethodType: pm.type,
      last4: pm.last4,
    });

    await prisma.paymentTransaction.create({
      data: {
        organizationId,
        billingAccountId: invoice.billingAccountId,
        invoiceId: invoice.id,
        paymentMethodId: pm.id,
        amountCents: amountToPay,
        currency: invoice.currency,
        status: chargeResult.status,
        type: "CHARGE",
        gateway: sandboxGateway.gatewayName,
        gatewayTransactionId: chargeResult.gatewayTransactionId,
        gatewayResponseCode: chargeResult.gatewayResponseCode,
        failureReason: chargeResult.failureReason,
        description: `Payment for invoice ${invoice.number}`,
      },
    });

    if (chargeResult.success) {
      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "PAID",
          amountPaidCents: invoice.totalCents,
          paidAt: new Date(),
          paymentMethodId: pm.id,
          memo: `Settled via ${pm.brand || pm.type} •••• ${pm.last4} (${chargeResult.gatewayTransactionId})`,
        },
      });

      logger.info("Invoice paid successfully", {
        event: "INVOICE_PAID",
        organizationId,
        invoiceId: invoice.id,
      });

      return updated;
    } else {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          memo: `Attempt failed: ${chargeResult.failureReason || "Declined"}`,
        },
      });
      const error: any = new Error(
        chargeResult.failureReason || "Payment declined by sandbox gateway",
      );
      error.code = "PAYMENT_FAILED";
      error.status = 402;
      throw error;
    }
  }

  async refundTransaction(
    organizationId: string,
    role: string,
    actorUserId: string,
    input: RefundTransactionInput,
  ) {
    assertBillingManage(role);
    const tx = await prisma.paymentTransaction.findFirst({
      where: { id: input.transactionId, organizationId },
      include: { invoice: true },
    });
    if (!tx) {
      const error: any = new Error("Transaction not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }
    if (tx.status !== "SUCCEEDED") {
      const error: any = new Error(
        tx.status === "REFUNDED"
          ? "Transaction has already been fully refunded"
          : `Cannot refund transaction with status ${tx.status}`,
      );
      error.code =
        tx.status === "REFUNDED" ? "ALREADY_REFUNDED" : "INVALID_STATE";
      error.status = 400;
      throw error;
    }
    const maxRefundable = tx.amountCents - tx.refundedAmountCents;
    if (maxRefundable <= 0) {
      const error: any = new Error("Transaction has already been fully refunded");
      error.code = "ALREADY_REFUNDED";
      error.status = 400;
      throw error;
    }

    const refundAmount = input.amountCents
      ? Math.min(input.amountCents, maxRefundable)
      : maxRefundable;

    const refundResult = await sandboxGateway.processRefund({
      organizationId,
      originalTransactionId: tx.id,
      originalGatewayTransactionId: tx.gatewayTransactionId,
      amountCents: refundAmount,
      currency: tx.currency,
      reason: input.reason,
    });

    if (!refundResult.success) {
      const error: any = new Error(
        refundResult.failureReason || "Refund failed",
      );
      error.code = "REFUND_FAILED";
      error.status = 400;
      throw error;
    }

    const newRefundedTotal = tx.refundedAmountCents + refundAmount;
    const isFullRefund = newRefundedTotal >= tx.amountCents;

    const result = await prisma.$transaction(async (prismaTx) => {
      const refundRecord = await prismaTx.paymentTransaction.create({
        data: {
          organizationId,
          billingAccountId: tx.billingAccountId,
          invoiceId: tx.invoiceId,
          paymentMethodId: tx.paymentMethodId,
          amountCents: refundAmount,
          currency: tx.currency,
          status: "REFUNDED",
          type: "REFUND",
          gateway: sandboxGateway.gatewayName,
          gatewayTransactionId: refundResult.refundGatewayId,
          gatewayResponseCode: refundResult.gatewayResponseCode,
          description: `Refund for ${tx.gatewayTransactionId}${input.reason ? ` - ${input.reason}` : ""}`,
        },
      });

      await prismaTx.paymentTransaction.update({
        where: { id: tx.id },
        data: {
          refundedAmountCents: newRefundedTotal,
          status: isFullRefund ? "REFUNDED" : "SUCCEEDED",
        },
      });

      if (tx.invoiceId) {
        const inv = await prismaTx.invoice.findUnique({
          where: { id: tx.invoiceId },
        });
        if (inv) {
          const newPaidCents = Math.max(0, inv.amountPaidCents - refundAmount);
          await prismaTx.invoice.update({
            where: { id: inv.id },
            data: {
              amountPaidCents: newPaidCents,
              status: isFullRefund ? "VOID" : inv.status,
              memo: `Refund of ${formatUsd(refundAmount)} processed (${refundResult.refundGatewayId})`,
            },
          });
        }
      }

      await prismaTx.auditLog.create({
        data: {
          organizationId,
          actorUserId,
          action: "PAYMENT_REFUNDED",
          resourceType: "PAYMENT_TRANSACTION",
          resourceId: refundRecord.id,
          details: JSON.stringify({
            originalTransactionId: tx.id,
            refundAmountCents: refundAmount,
            reason: input.reason || "Customer requested refund",
          }),
        },
      });

      return refundRecord;
    });

    return result;
  }

  async voidInvoice(
    organizationId: string,
    role: string,
    actorUserId: string,
    input: VoidInvoiceInput,
  ) {
    assertBillingManage(role);
    const invoice = await prisma.invoice.findFirst({
      where: { id: input.invoiceId, organizationId },
    });
    if (!invoice) {
      const error: any = new Error("Invoice not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }
    if (invoice.status === "PAID") {
      const error: any = new Error(
        "Cannot void a paid invoice. Process a refund instead.",
      );
      error.code = "INVOICE_PAID";
      error.status = 400;
      throw error;
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "VOID",
        memo: `Voided${input.reason ? `: ${input.reason}` : ""}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: "INVOICE_VOIDED",
        resourceType: "INVOICE",
        resourceId: invoice.id,
        details: JSON.stringify({
          number: invoice.number,
          reason: input.reason,
        }),
      },
    });

    return updated;
  }

  async getInvoice(organizationId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: {
        organization: true,
        billingAccount: true,
        paymentMethod: true,
        paymentTransactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!invoice) {
      const error: any = new Error("Invoice not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }
    return {
      ...invoice,
      lineItems: JSON.parse(invoice.lineItemsJson || "[]"),
    };
  }

  async getTransactions(
    organizationId: string,
    options?: { status?: string; limit?: number },
  ) {
    const where: any = { organizationId };
    if (options?.status) {
      where.status = options.status;
    }
    return prisma.paymentTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      include: {
        paymentMethod: true,
        invoice: {
          select: { number: true, totalCents: true, status: true },
        },
      },
    });
  }

  async cancelSubscription(
    organizationId: string,
    role: string,
    actorUserId: string,
    input: CancelSubscriptionInput,
  ) {
    assertBillingManage(role);
    const sub = await prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (!sub) {
      const error: any = new Error("Subscription not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const atPeriodEnd = input.cancelAtPeriodEnd ?? true;
    const now = new Date();

    if (atPeriodEnd) {
      await prisma.subscription.update({
        where: { organizationId },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: now,
        },
      });
    } else {
      await prisma.$transaction([
        prisma.subscription.update({
          where: { organizationId },
          data: {
            planKey: "FREE",
            status: "CANCELED",
            cancelAtPeriodEnd: false,
            canceledAt: now,
          },
        }),
        prisma.organization.update({
          where: { id: organizationId },
          data: { plan: "FREE" },
        }),
      ]);
    }

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: "SUBSCRIPTION_CANCELED",
        resourceType: "SUBSCRIPTION",
        resourceId: sub.id,
        details: JSON.stringify({ atPeriodEnd, reason: input.reason }),
      },
    });

    return this.getOverview(organizationId);
  }

  async reactivateSubscription(
    organizationId: string,
    role: string,
    actorUserId: string,
  ) {
    assertBillingManage(role);
    const sub = await prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (!sub) {
      const error: any = new Error("Subscription not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await prisma.subscription.update({
      where: { organizationId },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null,
        status: "ACTIVE",
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: "SUBSCRIPTION_REACTIVATED",
        resourceType: "SUBSCRIPTION",
        resourceId: sub.id,
        details: JSON.stringify({ planKey: sub.planKey }),
      },
    });

    return this.getOverview(organizationId);
  }
}

export const billingService = new BillingService();
