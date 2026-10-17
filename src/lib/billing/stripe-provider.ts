import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { PLAN_CATALOG, type BillingInterval, type PlanKey } from "./plans";

const paidPlans: PlanKey[] = ["TEAM", "BUSINESS", "ENTERPRISE"];
const intervals: BillingInterval[] = ["MONTHLY", "YEARLY"];

export class StripeBillingError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StripeBillingError";
  }
}

export function isStripeBillingEnabled() {
  return process.env.BILLING_PROVIDER === "stripe";
}

export function getStripeEnvironment():
  | "local"
  | "production-disabled"
  | "unconfigured"
  | "test"
  | "live"
  | "live-unapproved" {
  if (!isStripeBillingEnabled()) {
    return process.env.NODE_ENV === "production"
      ? "production-disabled"
      : "local";
  }
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (secretKey?.startsWith("sk_test_")) return "test";
  if (secretKey?.startsWith("sk_live_")) {
    return process.env.STRIPE_LIVE_MODE_APPROVED === "true"
      ? "live"
      : "live-unapproved";
  }
  return "unconfigured";
}

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new StripeBillingError(
      "Stripe billing is enabled but STRIPE_SECRET_KEY is not configured",
      "STRIPE_NOT_CONFIGURED",
      503,
    );
  }
  const liveMode = secretKey.startsWith("sk_live_");
  const testMode = secretKey.startsWith("sk_test_");
  if (!liveMode && !testMode) {
    throw new StripeBillingError(
      "STRIPE_SECRET_KEY must be a Stripe secret key for test or live mode",
      "STRIPE_KEY_INVALID",
      503,
    );
  }
  if (liveMode && process.env.STRIPE_LIVE_MODE_APPROVED !== "true") {
    throw new StripeBillingError(
      "Live Stripe processing requires explicit STRIPE_LIVE_MODE_APPROVED=true approval",
      "STRIPE_LIVE_MODE_NOT_APPROVED",
      503,
    );
  }
  return new Stripe(secretKey);
}

function getBaseUrl() {
  const configuredUrl = process.env.APP_BASE_URL?.trim();
  if (!configuredUrl) {
    throw new StripeBillingError(
      "APP_BASE_URL must be configured for Stripe billing",
      "STRIPE_NOT_CONFIGURED",
      503,
    );
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new StripeBillingError(
      "APP_BASE_URL must be a valid absolute URL",
      "STRIPE_NOT_CONFIGURED",
      503,
    );
  }

  const localHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !localHttp) {
    throw new StripeBillingError(
      "APP_BASE_URL must use HTTPS outside localhost",
      "STRIPE_NOT_CONFIGURED",
      503,
    );
  }
  return url.origin;
}

export function getStripePriceId(
  planKey: PlanKey,
  interval: BillingInterval,
) {
  if (planKey === "FREE") return null;
  const key = `STRIPE_PRICE_${planKey}_${interval}`;
  const priceId = process.env[key]?.trim();
  if (!priceId) {
    throw new StripeBillingError(
      `Stripe Price is not configured for ${planKey} ${interval.toLowerCase()}`,
      "STRIPE_PRICE_NOT_CONFIGURED",
      503,
    );
  }
  return priceId;
}

async function verifyStripePrice(
  stripe: Stripe,
  priceId: string,
  planKey: PlanKey,
  interval: BillingInterval,
  extraSeat = false,
) {
  const price = await stripe.prices.retrieve(priceId);
  const plan = PLAN_CATALOG[planKey];
  const expectedAmount = extraSeat
    ? plan.extraSeatMonthlyCents * (interval === "YEARLY" ? 10 : 1)
    : interval === "YEARLY"
      ? plan.yearlyCents
      : plan.monthlyCents;
  const expectedInterval = interval === "YEARLY" ? "year" : "month";
  if (
    !price.active ||
    price.currency !== "usd" ||
    price.unit_amount !== expectedAmount ||
    price.recurring?.interval !== expectedInterval ||
    price.recurring?.interval_count !== 1
  ) {
    throw new StripeBillingError(
      `Configured ${planKey} ${interval.toLowerCase()} Stripe Price does not match the displayed USD plan pricing`,
      "STRIPE_PRICE_MISMATCH",
      503,
    );
  }
}

export function validateStripeConfiguration() {
  if (!isStripeBillingEnabled()) return;
  getStripeClient();
  getBaseUrl();
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    throw new StripeBillingError(
      "STRIPE_WEBHOOK_SECRET is required when Stripe billing is enabled",
      "STRIPE_WEBHOOK_NOT_CONFIGURED",
      503,
    );
  }
}

function getStripeExtraSeatPriceId(
  planKey: PlanKey,
  interval: BillingInterval,
) {
  const key = `STRIPE_PRICE_${planKey}_EXTRA_SEAT_${interval}`;
  const priceId = process.env[key]?.trim();
  if (!priceId) {
    throw new StripeBillingError(
      `Stripe extra-seat Price is not configured for ${planKey} ${interval.toLowerCase()}`,
      "STRIPE_EXTRA_SEAT_PRICE_NOT_CONFIGURED",
      503,
    );
  }
  return priceId;
}

function planForPrice(priceId: string): {
  planKey: PlanKey;
  interval: BillingInterval;
} | null {
  for (const planKey of paidPlans) {
    for (const interval of intervals) {
      if (process.env[`STRIPE_PRICE_${planKey}_${interval}`]?.trim() === priceId) {
        return { planKey, interval };
      }
    }
  }
  return null;
}

function planForExtraSeatPrice(priceId: string): {
  planKey: PlanKey;
  interval: BillingInterval;
} | null {
  for (const planKey of paidPlans) {
    for (const interval of intervals) {
      if (
        process.env[
          `STRIPE_PRICE_${planKey}_EXTRA_SEAT_${interval}`
        ]?.trim() === priceId
      ) {
        return { planKey, interval };
      }
    }
  }
  return null;
}

function objectId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id;
}

function stripeStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
    case "trialing":
      return status.toUpperCase();
    case "past_due":
      return "PAST_DUE";
    case "unpaid":
      return "UNPAID";
    case "canceled":
      return "CANCELED";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    case "paused":
      return "PAUSED";
  }
}

function periodDates(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const start = item?.current_period_start;
  const end = item?.current_period_end;
  const now = new Date();
  return {
    start: start ? new Date(start * 1000) : now,
    end: end
      ? new Date(end * 1000)
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
  };
}

async function findOrganizationId(customerId: string | undefined) {
  if (!customerId) return null;
  const account = await prisma.billingAccount.findUnique({
    where: { stripeCustomerId: customerId },
    select: { organizationId: true },
  });
  return account?.organizationId ?? null;
}

async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  eventCreatedAt: number,
) {
  const customerId = objectId(subscription.customer);
  const organizationId = await findOrganizationId(customerId);
  if (!organizationId) {
    throw new StripeBillingError(
      "Stripe subscription is not linked to a BugTracker organization",
      "STRIPE_ORGANIZATION_NOT_FOUND",
      400,
    );
  }

  const baseLine = subscription.items.data.find((item) =>
    planForPrice(item.price.id),
  );
  const priceId = baseLine?.price.id;
  const plan = priceId ? planForPrice(priceId) : null;
  if (!priceId || !plan) {
    throw new StripeBillingError(
      "Stripe subscription has an unconfigured Price ID",
      "STRIPE_PRICE_NOT_CONFIGURED",
      400,
    );
  }

  const account = await prisma.billingAccount.findUnique({
    where: { organizationId },
    select: { id: true },
  });
  if (!account) {
    throw new StripeBillingError(
      "Billing account was not found for the Stripe subscription",
      "BILLING_ACCOUNT_NOT_FOUND",
      404,
    );
  }

  const existing = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { stripeLastEventCreatedAt: true },
  });
  if (
    existing?.stripeLastEventCreatedAt &&
    existing.stripeLastEventCreatedAt > eventCreatedAt
  ) {
    return;
  }

  const { start, end } = periodDates(subscription);
  const status = stripeStatus(subscription.status);
  const extraSeats = subscription.items.data
    .filter((item) => {
      const extraPlan = planForExtraSeatPrice(item.price.id);
      return (
        extraPlan?.planKey === plan.planKey &&
        extraPlan.interval === plan.interval
      );
    })
    .reduce((total, item) => total + (item.quantity || 0), 0);
  const seatQuantity = Math.min(
    5000,
    PLAN_CATALOG[plan.planKey].includedSeats + extraSeats,
  );
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  await prisma.$transaction([
    prisma.billingAccount.update({
      where: { organizationId },
      data: { stripeCustomerId: customerId },
    }),
    prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        billingAccountId: account.id,
        planKey: plan.planKey,
        status,
        billingInterval: plan.interval,
        seatQuantity,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd,
        canceledAt: status === "CANCELED" ? new Date() : null,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        stripeLastEventCreatedAt: eventCreatedAt,
      },
      update: {
        planKey: plan.planKey,
        status,
        billingInterval: plan.interval,
        seatQuantity,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd,
        canceledAt: status === "CANCELED" ? new Date() : null,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        stripeLastEventCreatedAt: eventCreatedAt,
      },
    }),
    prisma.organization.update({
      where: { id: organizationId },
      data: {
        plan:
          status === "ACTIVE" || status === "TRIALING"
            ? plan.planKey
            : "FREE",
      },
    }),
  ]);
}

async function upsertStripeInvoice(
  invoice: Stripe.Invoice,
  eventCreatedAt: number,
) {
  const customerId = objectId(invoice.customer);
  const organizationId = await findOrganizationId(customerId);
  if (!organizationId) {
    throw new StripeBillingError(
      "Stripe invoice is not linked to a BugTracker organization",
      "STRIPE_ORGANIZATION_NOT_FOUND",
      400,
    );
  }

  const account = await prisma.billingAccount.findUniqueOrThrow({
    where: { organizationId },
  });
  const existingInvoice = await prisma.invoice.findUnique({
    where: { stripeInvoiceId: invoice.id },
    select: { status: true, stripeLastEventCreatedAt: true },
  });
  if (
    existingInvoice &&
    (existingInvoice.status === "PAID" ||
      (existingInvoice.stripeLastEventCreatedAt &&
        existingInvoice.stripeLastEventCreatedAt > eventCreatedAt))
  ) {
    return;
  }
  const now = new Date(invoice.created * 1000);
  const paid = invoice.status === "paid";
  const totalCents = invoice.total;
  const amountPaidCents = paid ? invoice.amount_paid : 0;
  const currency = invoice.currency.toUpperCase();
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date * 1000)
    : now;
  const lines = invoice.lines.data.map((line) => {
    const quantity = line.quantity || 1;
    return {
      description: line.description || "Stripe subscription",
      quantity,
      unitAmountCents: Math.round(line.amount / quantity),
    };
  });
  const lineItemsJson = JSON.stringify(lines);
  const localInvoice = await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      organizationId,
      billingAccountId: account.id,
      number: `STRIPE-${invoice.id}`,
      stripeInvoiceId: invoice.id,
      stripeLastEventCreatedAt: eventCreatedAt,
      status: paid ? "PAID" : "OPEN",
      currency,
      subtotalCents: invoice.subtotal,
      taxCents: Math.max(0, invoice.total - invoice.subtotal),
      totalCents,
      amountPaidCents,
      periodStart: now,
      periodEnd: dueDate,
      dueDate,
      paidAt: paid ? now : null,
      lineItemsJson,
      memo: invoice.hosted_invoice_url || null,
    },
    update: {
      status: paid ? "PAID" : "OPEN",
      stripeLastEventCreatedAt: eventCreatedAt,
      amountPaidCents,
      paidAt: paid ? now : null,
      lineItemsJson,
      memo: invoice.hosted_invoice_url || null,
    },
  });

  const invoicePayments = paid
    ? await getStripeClient().invoicePayments.list({
        invoice: invoice.id,
        limit: 100,
      })
    : null;
  const paidInvoicePayment = invoicePayments?.data.find(
    (payment) =>
      payment.status === "paid" &&
      payment.payment.type === "payment_intent" &&
      payment.payment.payment_intent,
  );
  const paymentIntentId = objectId(
    paidInvoicePayment?.payment.payment_intent,
  );
  if (paid && !paymentIntentId) return;

  await prisma.paymentTransaction.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      organizationId,
      billingAccountId: account.id,
      invoiceId: localInvoice.id,
      amountCents: paid ? amountPaidCents : totalCents,
      currency,
      status: paid ? "SUCCEEDED" : "FAILED",
      type: "CHARGE",
      gateway: "STRIPE",
      gatewayTransactionId: paymentIntentId || invoice.id,
      stripeInvoiceId: invoice.id,
      stripeLastEventCreatedAt: eventCreatedAt,
      stripePaymentIntentId: paymentIntentId,
      failureReason: paid ? null : "Stripe invoice payment failed",
      description: `Stripe invoice ${invoice.number || invoice.id}`,
    },
    update: {
      amountCents: paid ? amountPaidCents : totalCents,
      status: paid ? "SUCCEEDED" : "FAILED",
      stripeLastEventCreatedAt: eventCreatedAt,
      stripePaymentIntentId: paymentIntentId,
      failureReason: paid ? null : "Stripe invoice payment failed",
    },
  });
}

async function processStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const subscriptionId = objectId(session.subscription);
      if (!subscriptionId) return;
      const subscription = await getStripeClient().subscriptions.retrieve(
        subscriptionId,
      );
      await syncStripeSubscription(subscription, event.created);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = await getStripeClient().subscriptions.retrieve(
        event.data.object.id,
      );
      await syncStripeSubscription(subscription, event.created);
      return;
    }
    case "invoice.paid":
    case "invoice.payment_succeeded":
    case "invoice.payment_failed": {
      const invoice = await getStripeClient().invoices.retrieve(
        event.data.object.id,
      );
      await upsertStripeInvoice(invoice, event.created);
      return;
    }
    case "charge.refunded": {
      const charge = await getStripeClient().charges.retrieve(
        event.data.object.id,
      );
      const paymentIntentId = objectId(charge.payment_intent);
      if (!paymentIntentId) return;
      const transaction = await prisma.paymentTransaction.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        select: {
          id: true,
          refundedAmountCents: true,
          stripeLastEventCreatedAt: true,
        },
      });
      if (
        !transaction ||
        (transaction.stripeLastEventCreatedAt &&
          transaction.stripeLastEventCreatedAt > event.created)
      ) {
        return;
      }
      const refundedAmountCents = Math.max(
        transaction.refundedAmountCents,
        charge.amount_refunded,
      );
      const fullyRefunded = refundedAmountCents >= charge.amount;
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          refundedAmountCents,
          status: fullyRefunded ? "REFUNDED" : "SUCCEEDED",
          stripeLastEventCreatedAt: event.created,
        },
      });
      return;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object;
      const chargeId = objectId(dispute.charge);
      if (!chargeId) return;
      const charge = await getStripeClient().charges.retrieve(chargeId);
      const paymentIntentId = objectId(charge.payment_intent);
      if (!paymentIntentId) return;
      const transaction = await prisma.paymentTransaction.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        select: { id: true, stripeLastEventCreatedAt: true },
      });
      if (
        !transaction ||
        (transaction.stripeLastEventCreatedAt &&
          transaction.stripeLastEventCreatedAt > event.created)
      ) {
        return;
      }
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          failureReason: "Payment is under dispute in Stripe",
          stripeLastEventCreatedAt: event.created,
        },
      });
      return;
    }
  }
}

export async function createStripeCheckoutSession(params: {
  organizationId: string;
  userId: string;
  role: string;
  planKey: PlanKey;
  billingInterval: BillingInterval;
  seatQuantity: number;
}) {
  if (!isStripeBillingEnabled()) {
    throw new StripeBillingError(
      "Stripe billing is not enabled",
      "STRIPE_DISABLED",
      503,
    );
  }
  if (!hasPermission(params.role, "billing.manage")) {
    throw new StripeBillingError(
      "You do not have permission to manage billing",
      "FORBIDDEN",
      403,
    );
  }
  if (params.planKey === "FREE" || !PLAN_CATALOG[params.planKey]) {
    throw new StripeBillingError(
      "Choose a paid plan to start Stripe Checkout",
      "INVALID_PLAN",
      400,
    );
  }
  const priceId = getStripePriceId(params.planKey, params.billingInterval);
  if (!priceId) {
    throw new StripeBillingError(
      "A paid Stripe Price is required for Checkout",
      "STRIPE_PRICE_NOT_CONFIGURED",
      503,
    );
  }
  const plan = PLAN_CATALOG[params.planKey];
  if (
    !Number.isInteger(params.seatQuantity) ||
    params.seatQuantity < 1 ||
    params.seatQuantity > 5000
  ) {
    throw new StripeBillingError(
      "Seat quantity must be between 1 and 5000",
      "INVALID_SEAT_QUANTITY",
      400,
    );
  }
  const seatQuantity = params.seatQuantity;
  const extraSeats = Math.max(0, seatQuantity - plan.includedSeats);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: priceId, quantity: 1 },
  ];
  let extraSeatPriceId: string | null = null;
  if (extraSeats > 0) {
    extraSeatPriceId = getStripeExtraSeatPriceId(
      params.planKey,
      params.billingInterval,
    );
    lineItems.push({
      price: extraSeatPriceId,
      quantity: extraSeats,
    });
  }
  const stripe = getStripeClient();
  await verifyStripePrice(
    stripe,
    priceId,
    params.planKey,
    params.billingInterval,
  );
  if (extraSeatPriceId) {
    await verifyStripePrice(
      stripe,
      extraSeatPriceId,
      params.planKey,
      params.billingInterval,
      true,
    );
  }
  const baseUrl = getBaseUrl();
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: params.organizationId },
    include: { billingAccount: true },
  });
  const account = organization.billingAccount;
  if (!account) {
    throw new StripeBillingError(
      "Billing account is not available for this organization",
      "BILLING_ACCOUNT_NOT_FOUND",
      404,
    );
  }

  let customerId = account.stripeCustomerId;
  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) customerId = null;
  }
  if (!customerId) {
    const customer = await stripe.customers.create(
      {
        email: account.billingEmail,
        name: account.companyName || organization.name,
        metadata: { organizationId: organization.id },
      },
    );
    customerId = customer.id;
    await prisma.billingAccount.update({
      where: { organizationId: organization.id },
      data: { stripeCustomerId: customerId },
    });
  }
  if (!customerId) {
    throw new StripeBillingError(
      "Unable to link a Stripe customer to this workspace",
      "STRIPE_CUSTOMER_REQUIRED",
      502,
    );
  }

  const currentSubscription = await prisma.subscription.findUnique({
    where: { organizationId: organization.id },
    select: { stripeSubscriptionId: true, status: true },
  });
  if (
    currentSubscription?.stripeSubscriptionId &&
    [
      "ACTIVE",
      "TRIALING",
      "PAST_DUE",
      "UNPAID",
      "INCOMPLETE",
      "PAUSED",
    ].includes(currentSubscription.status)
  ) {
    throw new StripeBillingError(
      "This workspace already has a Stripe subscription. Use the billing portal to change or manage it.",
      "STRIPE_SUBSCRIPTION_EXISTS",
      409,
    );
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: customerId,
      client_reference_id: organization.id,
      line_items: lineItems,
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: process.env.STRIPE_AUTOMATIC_TAX === "true",
      },
      success_url: `${baseUrl}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings/billing?checkout=cancelled`,
      metadata: {
        organizationId: organization.id,
        userId: params.userId,
        planKey: params.planKey,
        billingInterval: params.billingInterval,
        seatQuantity: String(params.seatQuantity),
      },
      subscription_data: {
        metadata: {
          organizationId: organization.id,
          planKey: params.planKey,
          billingInterval: params.billingInterval,
          seatQuantity: String(params.seatQuantity),
        },
      },
    },
    {
      idempotencyKey: [
        "bugtracker-checkout",
        organization.id,
        params.planKey,
        params.billingInterval,
        params.seatQuantity,
        Math.floor(Date.now() / 60_000),
      ].join("-"),
    },
  );

  if (!session.url) {
    throw new StripeBillingError(
      "Stripe did not return a hosted Checkout URL",
      "STRIPE_CHECKOUT_UNAVAILABLE",
      502,
    );
  }
  return { url: session.url, sessionId: session.id };
}

export async function createStripePortalSession(params: {
  organizationId: string;
  role: string;
}) {
  if (!isStripeBillingEnabled()) {
    throw new StripeBillingError(
      "Stripe billing is not enabled",
      "STRIPE_DISABLED",
      503,
    );
  }
  if (!hasPermission(params.role, "billing.manage")) {
    throw new StripeBillingError(
      "You do not have permission to manage billing",
      "FORBIDDEN",
      403,
    );
  }
  const account = await prisma.billingAccount.findUnique({
    where: { organizationId: params.organizationId },
    select: { stripeCustomerId: true },
  });
  if (!account?.stripeCustomerId) {
    throw new StripeBillingError(
      "No Stripe customer is linked to this workspace yet",
      "STRIPE_CUSTOMER_REQUIRED",
      400,
    );
  }

  const portal = await getStripeClient().billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${getBaseUrl()}/settings/billing`,
  });
  return { url: portal.url };
}

export async function handleStripeWebhook(rawBody: string, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new StripeBillingError(
      "STRIPE_WEBHOOK_SECRET is not configured",
      "STRIPE_WEBHOOK_NOT_CONFIGURED",
      503,
    );
  }
  const event = getStripeClient().webhooks.constructEvent(
    rawBody,
    signature,
    webhookSecret,
  );

  let recordId: string;
  try {
    const eventRecord = await prisma.stripeWebhookEvent.create({
      data: { stripeEventId: event.id, eventType: event.type },
      select: { id: true },
    });
    recordId = eventRecord.id;
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    const existing = await prisma.stripeWebhookEvent.findUniqueOrThrow({
      where: { stripeEventId: event.id },
    });
    if (existing.status === "PROCESSED") {
      return { received: true, duplicate: true };
    }
    const staleBefore = new Date(Date.now() - 5 * 60_000);
    const claimed = await prisma.stripeWebhookEvent.updateMany({
      where: {
        id: existing.id,
        OR: [
          { status: "FAILED" },
          { status: "PROCESSING", receivedAt: { lt: staleBefore } },
        ],
      },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
        receivedAt: new Date(),
        lastError: null,
      },
    });
    if (claimed.count === 0) {
      return { received: true, duplicate: true };
    }
    recordId = existing.id;
  }

  try {
    await processStripeEvent(event);
    await prisma.stripeWebhookEvent.update({
      where: { id: recordId },
      data: { status: "PROCESSED", processedAt: new Date(), lastError: null },
    });
    return { received: true, duplicate: false };
  } catch (error) {
    await prisma.stripeWebhookEvent.update({
      where: { id: recordId },
      data: {
        status: "FAILED",
        lastError:
          error instanceof Error ? error.message.slice(0, 1000) : "Processing failed",
      },
    });
    throw error;
  }
}
