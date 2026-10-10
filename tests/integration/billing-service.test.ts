import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { organizationService } from "@/services/organization.service";
import { billingService } from "@/services/billing.service";

describe("Integration: Billing service", () => {
  const timestamp = Date.now();
  let owner: { id: string };
  let developer: { id: string };
  let org: { id: string };

  afterAll(async () => {
    if (org?.id) {
      await prisma.organization.deleteMany({ where: { id: org.id } });
    }
    if (owner?.id) await prisma.user.deleteMany({ where: { id: owner.id } });
    if (developer?.id) {
      await prisma.user.deleteMany({ where: { id: developer.id } });
    }
  });

  it("provisions a free billing account with the organization", async () => {
    owner = await prisma.user.create({
      data: {
        name: "Billing Owner",
        email: `billing-owner-${timestamp}@example.com`,
        status: "ACTIVE",
      },
    });
    developer = await prisma.user.create({
      data: {
        name: "Billing Dev",
        email: `billing-dev-${timestamp}@example.com`,
        status: "ACTIVE",
      },
    });
    org = await organizationService.createOrganization(owner.id, {
      name: "Billing Labs",
      slug: `billing-labs-${timestamp}`,
    });

    await prisma.membership.create({
      data: {
        organizationId: org.id,
        userId: developer.id,
        role: "DEVELOPER",
        status: "ACTIVE",
      },
    });

    const overview = await billingService.getOverview(org.id);
    expect(overview.organization.plan).toBe("FREE");
    expect(overview.subscription?.planKey).toBe("FREE");
    expect(overview.account.billingEmail).toContain("@");
  });

  it("rejects developers from adding payment methods", async () => {
    await expect(
      billingService.addPaymentMethod(org.id, "DEVELOPER", developer.id, {
        type: "CARD",
        pan: "4242424242424242",
        cvc: "123",
        expMonth: 12,
        expYear: 2030,
        holderName: "Dev User",
        billingCountry: "US",
        setDefault: true,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("adds a tokenized card and upgrades to Team", async () => {
    const method = await billingService.addPaymentMethod(
      org.id,
      "ORGANIZATION_OWNER",
      owner.id,
      {
        type: "CARD",
        pan: "4242424242424242",
        cvc: "123",
        expMonth: 12,
        expYear: 2030,
        holderName: "Billing Owner",
        billingCountry: "US",
        setDefault: true,
      },
    );
    expect(method.last4).toBe("4242");
    expect(method.brand).toBe("visa");

    const upgraded = await billingService.changePlan(
      org.id,
      "ORGANIZATION_OWNER",
      owner.id,
      { planKey: "TEAM", billingInterval: "MONTHLY", seatQuantity: 10 },
    );
    expect(upgraded.organization.plan).toBe("TEAM");
    expect(upgraded.invoices.length).toBeGreaterThan(0);
    expect(upgraded.invoices[0].status).toBe("PAID");
    expect(JSON.stringify(method)).not.toContain("4242424242424242");
  });

  it("adds ACH and invoice instruments", async () => {
    const ach = await billingService.addPaymentMethod(
      org.id,
      "OWNER",
      owner.id,
      {
        type: "ACH",
        accountNumber: "000123456789",
        routingNumber: "021000021",
        holderName: "Billing Labs",
        bankName: "Chase",
        billingCountry: "US",
        setDefault: false,
      },
    );
    expect(ach.type).toBe("ACH");
    expect(ach.last4).toBe("6789");

    const invoice = await billingService.addPaymentMethod(
      org.id,
      "ORGANIZATION_OWNER",
      owner.id,
      {
        type: "INVOICE",
        poNumber: "PO-9001",
        holderName: "AP Desk",
        billingCountry: "US",
        setDefault: false,
      },
    );
    expect(invoice.type).toBe("INVOICE");
  });
});
