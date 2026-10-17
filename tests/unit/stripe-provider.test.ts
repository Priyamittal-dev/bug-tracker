import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  organizationFindUniqueOrThrow: vi.fn(),
  billingAccountFindUnique: vi.fn(),
  billingAccountUpdate: vi.fn(),
  subscriptionFindUnique: vi.fn(),
  subscriptionUpsert: vi.fn(),
  organizationUpdate: vi.fn(),
  transaction: vi.fn(),
  stripeWebhookEventCreate: vi.fn(),
  stripeWebhookEventUpdate: vi.fn(),
  stripeWebhookEventFindUniqueOrThrow: vi.fn(),
  customerRetrieve: vi.fn(),
  customerCreate: vi.fn(),
  priceRetrieve: vi.fn(),
  checkoutSessionCreate: vi.fn(),
  portalSessionCreate: vi.fn(),
  subscriptionRetrieve: vi.fn(),
  constructEvent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUniqueOrThrow: stripeMocks.organizationFindUniqueOrThrow,
      update: stripeMocks.organizationUpdate,
    },
    billingAccount: {
      findUnique: stripeMocks.billingAccountFindUnique,
      update: stripeMocks.billingAccountUpdate,
    },
    subscription: {
      findUnique: stripeMocks.subscriptionFindUnique,
      upsert: stripeMocks.subscriptionUpsert,
    },
    $transaction: stripeMocks.transaction,
    stripeWebhookEvent: {
      create: stripeMocks.stripeWebhookEventCreate,
      update: stripeMocks.stripeWebhookEventUpdate,
      findUniqueOrThrow: stripeMocks.stripeWebhookEventFindUniqueOrThrow,
    },
  },
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    customers = {
      retrieve: stripeMocks.customerRetrieve,
      create: stripeMocks.customerCreate,
    };
    prices = { retrieve: stripeMocks.priceRetrieve };
    checkout = {
      sessions: { create: stripeMocks.checkoutSessionCreate },
    };
    billingPortal = {
      sessions: { create: stripeMocks.portalSessionCreate },
    };
    subscriptions = { retrieve: stripeMocks.subscriptionRetrieve };
    webhooks = { constructEvent: stripeMocks.constructEvent };
  },
}));

import {
  createStripeCheckoutSession,
  createStripePortalSession,
  getStripeClient,
  getStripeEnvironment,
  getStripePriceId,
  handleStripeWebhook,
  validateStripeConfiguration,
} from "@/lib/billing/stripe-provider";
import { billingService } from "@/services/billing.service";

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.clearAllMocks();
  stripeMocks.customerCreate.mockResolvedValue({ id: "cus_test_1" });
  stripeMocks.priceRetrieve.mockImplementation(async (priceId: string) => ({
    active: true,
    currency: "usd",
    unit_amount: priceId === "price_team_extra" ? 800 : 1200,
    recurring: { interval: "month", interval_count: 1 },
  }));
  stripeMocks.checkoutSessionCreate.mockResolvedValue({
    id: "cs_test_1",
    url: "https://checkout.stripe.test/session",
  });
  stripeMocks.portalSessionCreate.mockResolvedValue({
    url: "https://billing.stripe.test/portal",
  });
  stripeMocks.billingAccountUpdate.mockResolvedValue({});
  stripeMocks.subscriptionUpsert.mockResolvedValue({});
  stripeMocks.organizationUpdate.mockResolvedValue({});
  stripeMocks.transaction.mockResolvedValue([]);
  stripeMocks.stripeWebhookEventCreate.mockResolvedValue({
    id: "webhook_test",
  });
  stripeMocks.stripeWebhookEventUpdate.mockResolvedValue({});
  stripeMocks.constructEvent.mockImplementation(() => {
    throw Object.assign(new Error("Invalid signature"), {
      type: "StripeSignatureVerificationError",
    });
  });
});

describe("Stripe billing configuration", () => {
  it("requires a Stripe secret key", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    expect(() => getStripeClient()).toThrowError(
      expect.objectContaining({ code: "STRIPE_NOT_CONFIGURED" }),
    );
  });

  it("rejects live keys unless explicit approval is configured", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_example");
    vi.stubEnv("STRIPE_LIVE_MODE_APPROVED", "false");

    expect(() => getStripeClient()).toThrowError(
      expect.objectContaining({ code: "STRIPE_LIVE_MODE_NOT_APPROVED" }),
    );
  });

  it("accepts test keys without enabling live processing", () => {
    vi.stubEnv("BILLING_PROVIDER", "stripe");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_LIVE_MODE_APPROVED", "false");

    expect(getStripeClient()).toBeDefined();
    expect(getStripeEnvironment()).toBe("test");
  });

  it("does not describe an unapproved live key as active billing", () => {
    vi.stubEnv("BILLING_PROVIDER", "stripe");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_example");
    vi.stubEnv("STRIPE_LIVE_MODE_APPROVED", "false");

    expect(getStripeEnvironment()).toBe("live-unapproved");
  });

  it("disables simulated billing mutations in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BILLING_PROVIDER", "local");

    await expect(
      billingService.changePlan("org_test", "OWNER", "user_test", {
        planKey: "TEAM",
        billingInterval: "MONTHLY",
        seatQuantity: 10,
      }),
    ).rejects.toMatchObject({
      code: "BILLING_PROVIDER_REQUIRED",
      status: 503,
    });
    expect(getStripeEnvironment()).toBe("production-disabled");
  });

  it("requires a configured recurring price for paid plans", () => {
    vi.stubEnv("STRIPE_PRICE_TEAM_MONTHLY", "");
    expect(() => getStripePriceId("TEAM", "MONTHLY")).toThrowError(
      expect.objectContaining({ code: "STRIPE_PRICE_NOT_CONFIGURED" }),
    );

    vi.stubEnv("STRIPE_PRICE_TEAM_MONTHLY", "price_team_monthly_test");
    expect(getStripePriceId("TEAM", "MONTHLY")).toBe("price_team_monthly_test");
    expect(getStripePriceId("FREE", "MONTHLY")).toBeNull();
  });

  it("validates Stripe credentials, webhook secret, and public URL at startup", () => {
    vi.stubEnv("BILLING_PROVIDER", "stripe");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_example");
    vi.stubEnv("APP_BASE_URL", "https://tracker.example.com");

    expect(() => validateStripeConfiguration()).not.toThrow();
  });

  it("rejects insecure public Stripe return URLs outside localhost", () => {
    vi.stubEnv("BILLING_PROVIDER", "stripe");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_example");
    vi.stubEnv("APP_BASE_URL", "http://tracker.example.com");

    expect(() => validateStripeConfiguration()).toThrowError(
      expect.objectContaining({ code: "STRIPE_NOT_CONFIGURED" }),
    );
  });
});

describe("Stripe billing authorization and webhooks", () => {
  it("rejects checkout creation for roles without billing permission", async () => {
    vi.stubEnv("BILLING_PROVIDER", "stripe");

    await expect(
      createStripeCheckoutSession({
        organizationId: "org_test",
        userId: "user_test",
        role: "DEVELOPER",
        planKey: "TEAM",
        billingInterval: "MONTHLY",
        seatQuantity: 5,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("rejects billing portal sessions for roles without billing permission", async () => {
    vi.stubEnv("BILLING_PROVIDER", "stripe");

    await expect(
      createStripePortalSession({
        organizationId: "org_test",
        role: "DEVELOPER",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("creates a hosted Checkout session with recurring extra-seat quantities", async () => {
    vi.stubEnv("BILLING_PROVIDER", "stripe");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_PRICE_TEAM_MONTHLY", "price_team_monthly");
    vi.stubEnv("STRIPE_PRICE_TEAM_EXTRA_SEAT_MONTHLY", "price_team_extra");
    vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
    stripeMocks.organizationFindUniqueOrThrow.mockResolvedValue({
      id: "org_test",
      name: "Test Org",
      billingAccount: {
        stripeCustomerId: null,
        billingEmail: "billing@example.test",
        companyName: "Test Org",
      },
    });
    stripeMocks.billingAccountUpdate.mockResolvedValue({});
    stripeMocks.subscriptionFindUnique.mockResolvedValue(null);

    const result = await createStripeCheckoutSession({
      organizationId: "org_test",
      userId: "user_test",
      role: "OWNER",
      planKey: "TEAM",
      billingInterval: "MONTHLY",
      seatQuantity: 12,
    });

    expect(result.url).toBe("https://checkout.stripe.test/session");
    expect(stripeMocks.checkoutSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        line_items: [
          { price: "price_team_monthly", quantity: 1 },
          { price: "price_team_extra", quantity: 2 },
        ],
        success_url: expect.stringContaining("/settings/billing?checkout=success"),
      }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining("org_test") }),
    );
  });

  it("does not start Checkout when the configured Stripe amount differs from displayed pricing", async () => {
    vi.stubEnv("BILLING_PROVIDER", "stripe");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_PRICE_TEAM_MONTHLY", "price_team_monthly");
    stripeMocks.priceRetrieve.mockResolvedValue({
      active: true,
      currency: "usd",
      unit_amount: 1,
      recurring: { interval: "month", interval_count: 1 },
    });

    await expect(
      createStripeCheckoutSession({
        organizationId: "org_test",
        userId: "user_test",
        role: "OWNER",
        planKey: "TEAM",
        billingInterval: "MONTHLY",
        seatQuantity: 5,
      }),
    ).rejects.toMatchObject({ code: "STRIPE_PRICE_MISMATCH", status: 503 });
    expect(stripeMocks.organizationFindUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("does not grant access from an already processed webhook event", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_example");
    stripeMocks.constructEvent.mockReturnValue({
      id: "evt_processed",
      type: "customer.subscription.updated",
      created: 100,
      data: { object: { id: "sub_test" } },
    });
    stripeMocks.stripeWebhookEventCreate.mockRejectedValue(
      Object.assign(new Error("Unique constraint"), { code: "P2002" }),
    );
    stripeMocks.stripeWebhookEventFindUniqueOrThrow.mockResolvedValue({
      id: "webhook_test",
      status: "PROCESSED",
    });

    await expect(
      handleStripeWebhook("{}", "valid-signature"),
    ).resolves.toEqual({ received: true, duplicate: true });
    expect(stripeMocks.customerRetrieve).not.toHaveBeenCalled();
  });

  it("grants paid entitlements only from an active subscription webhook", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_example");
    vi.stubEnv("STRIPE_PRICE_TEAM_MONTHLY", "price_team_monthly");
    stripeMocks.constructEvent.mockReturnValue({
      id: "evt_subscription_active",
      type: "customer.subscription.updated",
      created: 100,
      data: { object: { id: "sub_test_1" } },
    });
    stripeMocks.subscriptionRetrieve.mockResolvedValue({
      id: "sub_test_1",
      customer: "cus_test_1",
      metadata: {},
      status: "active",
      cancel_at_period_end: false,
      items: {
        data: [
          {
            price: { id: "price_team_monthly" },
            quantity: 1,
            current_period_start: 100,
            current_period_end: 200,
          },
        ],
      },
    });
    stripeMocks.billingAccountFindUnique.mockResolvedValue({
      id: "billing_test",
      organizationId: "org_test",
    });
    stripeMocks.subscriptionFindUnique.mockResolvedValue({
      stripeLastEventCreatedAt: null,
    });

    await expect(
      handleStripeWebhook("{}", "valid-signature"),
    ).resolves.toEqual({ received: true, duplicate: false });
    expect(stripeMocks.organizationUpdate).toHaveBeenCalledWith({
      where: { id: "org_test" },
      data: { plan: "TEAM" },
    });
  });

  it("requires a webhook secret before accepting webhook requests", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");

    await expect(handleStripeWebhook("{}", "invalid")).rejects.toMatchObject({
      code: "STRIPE_WEBHOOK_NOT_CONFIGURED",
      status: 503,
    });
  });

  it("rejects webhook signatures that Stripe cannot verify", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_example");

    await expect(
      handleStripeWebhook("{}", "t=0,v1=invalid"),
    ).rejects.toMatchObject({ type: "StripeSignatureVerificationError" });
  });
});
