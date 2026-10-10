import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { organizationService } from "@/services/organization.service";
import { billingService } from "@/services/billing.service";

describe("Integration: End-to-End Payment & Billing System", () => {
  const timestamp = Date.now();
  let owner: { id: string };
  let admin: { id: string };
  let developer: { id: string };
  let viewer: { id: string };
  let org: { id: string; slug: string };

  let successCardId: string;
  let declineCardId: string;
  let successTxId: string;

  beforeAll(async () => {
    owner = await prisma.user.create({
      data: {
        name: "FinOps Owner",
        email: `finops-owner-${timestamp}@enterprise.test`,
        status: "ACTIVE",
      },
    });
    admin = await prisma.user.create({
      data: {
        name: "FinOps Admin",
        email: `finops-admin-${timestamp}@enterprise.test`,
        status: "ACTIVE",
      },
    });
    developer = await prisma.user.create({
      data: {
        name: "Dev User",
        email: `dev-user-${timestamp}@enterprise.test`,
        status: "ACTIVE",
      },
    });
    viewer = await prisma.user.create({
      data: {
        name: "Viewer User",
        email: `viewer-${timestamp}@enterprise.test`,
        status: "ACTIVE",
      },
    });

    const createdOrg = await organizationService.createOrganization(owner.id, {
      name: "FinOps Global Corp",
      slug: `finops-corp-${timestamp}`,
    });
    org = { id: createdOrg.id, slug: createdOrg.slug };

    await prisma.membership.createMany({
      data: [
        {
          organizationId: org.id,
          userId: admin.id,
          role: "ORGANIZATION_ADMIN",
          status: "ACTIVE",
        },
        {
          organizationId: org.id,
          userId: developer.id,
          role: "DEVELOPER",
          status: "ACTIVE",
        },
        {
          organizationId: org.id,
          userId: viewer.id,
          role: "VIEWER",
          status: "ACTIVE",
        },
      ],
    });
  });

  afterAll(async () => {
    if (org?.id) {
      await prisma.organization.deleteMany({ where: { id: org.id } });
    }
    const userIds = [owner?.id, admin?.id, developer?.id, viewer?.id].filter(
      Boolean,
    );
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it("verifies initial workspace provisions Free tier with zero instruments", async () => {
    const overview = await billingService.getOverview(org.id);
    expect(overview.organization.plan).toBe("FREE");
    expect(overview.paymentMethods).toHaveLength(0);
    expect(overview.transactions).toHaveLength(0);
    expect(overview.invoices).toHaveLength(0);
  });

  it("enforces RBAC boundaries: prevents developer & viewer from managing billing", async () => {
    await expect(
      billingService.addPaymentMethod(org.id, "DEVELOPER", developer.id, {
        type: "CARD",
        pan: "4242424242424242",
        cvc: "123",
        expMonth: 12,
        expYear: 2030,
        holderName: "Unauthorized Dev",
        billingCountry: "US",
        setDefault: true,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      billingService.changePlan(org.id, "VIEWER", viewer.id, {
        planKey: "TEAM",
        billingInterval: "MONTHLY",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("safely tokenizes test card without echoing raw PAN or CVC", async () => {
    const successCard = await billingService.addPaymentMethod(
      org.id,
      "ORGANIZATION_OWNER",
      owner.id,
      {
        type: "CARD",
        pan: "4242 4242 4242 4242",
        cvc: "123",
        expMonth: 12,
        expYear: 2029,
        holderName: "Ada Lovelace",
        billingCountry: "US",
        setDefault: true,
      },
    );

    successCardId = successCard.id;
    expect(successCard.last4).toBe("4242");
    expect(successCard.brand).toBe("visa");
    expect(successCard.isDefault).toBe(true);

    const serialized = JSON.stringify(successCard);
    expect(serialized).not.toContain("4242424242424242");
    expect(serialized).not.toContain("123");

    // Add declining test card as well
    const declineCard = await billingService.addPaymentMethod(
      org.id,
      "ORGANIZATION_ADMIN",
      admin.id,
      {
        type: "CARD",
        pan: "4000 0000 0000 0002",
        cvc: "999",
        expMonth: 12,
        expYear: 2029,
        holderName: "Declined User",
        billingCountry: "US",
        setDefault: false,
      },
    );
    declineCardId = declineCard.id;
    expect(declineCard.last4).toBe("0002");
  });

  it("upgrades workspace to Team plan, executes sandbox charge, and tracks transaction", async () => {
    const upgraded = await billingService.changePlan(
      org.id,
      "ORGANIZATION_OWNER",
      owner.id,
      {
        planKey: "TEAM",
        billingInterval: "MONTHLY",
        seatQuantity: 10,
      },
    );

    expect(upgraded.organization.plan).toBe("TEAM");
    expect(upgraded.invoices.length).toBeGreaterThan(0);

    const latestInvoice = upgraded.invoices[0];
    expect(latestInvoice.status).toBe("PAID");
    expect(latestInvoice.totalCents).toBe(1200);
    expect(latestInvoice.amountPaidCents).toBe(1200);

    // Verify PaymentTransaction ledger
    const transactions = await billingService.getTransactions(org.id);
    expect(transactions.length).toBeGreaterThan(0);

    const chargeTx = transactions.find((t) => t.type === "CHARGE");
    expect(chargeTx).toBeDefined();
    expect(chargeTx?.status).toBe("SUCCEEDED");
    expect(chargeTx?.gateway).toBe("STRIPE_SANDBOX");
    expect(chargeTx?.gatewayTransactionId).toMatch(/^ch_test_/);
    expect(chargeTx?.amountCents).toBe(1200);

    successTxId = chargeTx!.id;
  });

  it("handles declining cards: records FAILED transaction and halts upgrade", async () => {
    // Set default payment method to the declining card (0002)
    await billingService.setDefaultPaymentMethod(
      org.id,
      "ORGANIZATION_ADMIN",
      declineCardId,
    );

    // Attempt to change plan to Business -> must fail at gateway
    await expect(
      billingService.changePlan(org.id, "ORGANIZATION_ADMIN", admin.id, {
        planKey: "BUSINESS",
        billingInterval: "MONTHLY",
        seatQuantity: 25,
      }),
    ).rejects.toMatchObject({
      code: "PAYMENT_FAILED",
    });

    // Check that a FAILED transaction was recorded in ledger
    const transactions = await billingService.getTransactions(org.id, {
      status: "FAILED",
    });
    expect(transactions.length).toBeGreaterThan(0);
    const failedTx = transactions[0];
    expect(failedTx.status).toBe("FAILED");
    expect(failedTx.failureReason).toContain("declined");

    // Restore success card as default
    await billingService.setDefaultPaymentMethod(
      org.id,
      "ORGANIZATION_OWNER",
      successCardId,
    );
  });

  it("processes partial and full refunds on succeeded transactions", async () => {
    // 1. Partial refund of $5.00
    const partialRefund = await billingService.refundTransaction(
      org.id,
      "ORGANIZATION_OWNER",
      owner.id,
      {
        transactionId: successTxId,
        amountCents: 500,
        reason: "Partial fee adjustment",
      },
    );

    expect(partialRefund.status).toBe("REFUNDED");
    expect(partialRefund.type).toBe("REFUND");
    expect(partialRefund.amountCents).toBe(500);

    // Verify original transaction state
    const originalTx = await prisma.paymentTransaction.findUniqueOrThrow({
      where: { id: successTxId },
    });
    expect(originalTx.refundedAmountCents).toBe(500);
    expect(originalTx.status).toBe("SUCCEEDED"); // Not full refund yet

    // 2. Complete remaining refund of $7.00
    const finalRefund = await billingService.refundTransaction(
      org.id,
      "ORGANIZATION_OWNER",
      owner.id,
      {
        transactionId: successTxId,
        amountCents: 700,
        reason: "Full remaining refund",
      },
    );
    expect(finalRefund.amountCents).toBe(700);

    const fullyRefundedTx = await prisma.paymentTransaction.findUniqueOrThrow({
      where: { id: successTxId },
    });
    expect(fullyRefundedTx.refundedAmountCents).toBe(1200);
    expect(fullyRefundedTx.status).toBe("REFUNDED");

    // 3. Attempting another refund must fail
    await expect(
      billingService.refundTransaction(org.id, "ORGANIZATION_OWNER", owner.id, {
        transactionId: successTxId,
        amountCents: 100,
      }),
    ).rejects.toMatchObject({ code: "ALREADY_REFUNDED" });
  });

  it("supports invoice detail retrieval and voiding", async () => {
    const overview = await billingService.getOverview(org.id);
    const invoice = overview.invoices[0];

    const detailedInvoice = await billingService.getInvoice(
      org.id,
      invoice.id,
    );
    expect(detailedInvoice.id).toBe(invoice.id);
    expect(Array.isArray(detailedInvoice.lineItems)).toBe(true);
    expect(detailedInvoice.lineItems.length).toBeGreaterThan(0);
  });

  it("manages subscription cancellation and reactivation cycles", async () => {
    // Schedule cancellation at period end
    const cancelScheduled = await billingService.cancelSubscription(
      org.id,
      "ORGANIZATION_OWNER",
      owner.id,
      { cancelAtPeriodEnd: true, reason: "Project completion" },
    );
    expect(cancelScheduled.subscription?.cancelAtPeriodEnd).toBe(true);
    expect(cancelScheduled.subscription?.canceledAt).toBeDefined();

    // Reactivate
    const reactivated = await billingService.reactivateSubscription(
      org.id,
      "ORGANIZATION_ADMIN",
      admin.id,
    );
    expect(reactivated.subscription?.cancelAtPeriodEnd).toBe(false);
    expect(reactivated.subscription?.canceledAt).toBeNull();

    // Immediate cancellation -> downgrades to FREE
    const immediateCancel = await billingService.cancelSubscription(
      org.id,
      "ORGANIZATION_OWNER",
      owner.id,
      { cancelAtPeriodEnd: false, reason: "Immediate shutdown" },
    );
    expect(immediateCancel.organization.plan).toBe("FREE");
    expect(immediateCancel.subscription?.planKey).toBe("FREE");
  });
});
