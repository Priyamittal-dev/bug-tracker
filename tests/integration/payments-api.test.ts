import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { organizationService } from "@/services/organization.service";
import { billingService } from "@/services/billing.service";
import { GET as getPlansRoute } from "@/app/api/v1/billing/plans/route";

describe("Integration: Billing & Payments REST API Handlers", () => {
  const timestamp = Date.now();
  let owner: { id: string };
  let org: { id: string; slug: string };

  beforeAll(async () => {
    owner = await prisma.user.create({
      data: {
        name: "API Tester",
        email: `api-tester-${timestamp}@test.com`,
        status: "ACTIVE",
      },
    });

    const createdOrg = await organizationService.createOrganization(owner.id, {
      name: "API Test Corp",
      slug: `api-test-${timestamp}`,
    });
    org = { id: createdOrg.id, slug: createdOrg.slug };
  });

  afterAll(async () => {
    if (org?.id) {
      await prisma.organization.deleteMany({ where: { id: org.id } });
    }
    if (owner?.id) {
      await prisma.user.deleteMany({ where: { id: owner.id } });
    }
  });

  it("serves plans catalog route with 4 tiers", async () => {
    const res = await getPlansRoute();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.plans).toHaveLength(4);
    expect(json.data.currency).toBe("USD");
  });

  it("handles payment transactions retrieval by status", async () => {
    // Add payment method and subscribe
    await billingService.addPaymentMethod(
      org.id,
      "ORGANIZATION_OWNER",
      owner.id,
      {
        type: "CARD",
        pan: "4242424242424242",
        cvc: "123",
        expMonth: 12,
        expYear: 2029,
        holderName: "API Tester",
        billingCountry: "US",
        setDefault: true,
      },
    );

    await billingService.changePlan(org.id, "ORGANIZATION_OWNER", owner.id, {
      planKey: "TEAM",
      billingInterval: "MONTHLY",
    });

    const allTx = await billingService.getTransactions(org.id);
    expect(allTx.length).toBeGreaterThan(0);

    const succeededTx = await billingService.getTransactions(org.id, {
      status: "SUCCEEDED",
    });
    expect(succeededTx.length).toBeGreaterThan(0);

    const failedTx = await billingService.getTransactions(org.id, {
      status: "FAILED",
    });
    expect(failedTx).toHaveLength(0);
  });
});
