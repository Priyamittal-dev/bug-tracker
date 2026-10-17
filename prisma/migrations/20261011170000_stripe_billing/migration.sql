ALTER TABLE "BillingAccount" ADD COLUMN "stripeCustomerId" TEXT;

CREATE UNIQUE INDEX "BillingAccount_stripeCustomerId_key" ON "BillingAccount"("stripeCustomerId");

ALTER TABLE "Subscription" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "stripePriceId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "stripeLastEventCreatedAt" INTEGER;

CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

ALTER TABLE "Invoice" ADD COLUMN "stripeInvoiceId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "stripeLastEventCreatedAt" INTEGER;

CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

ALTER TABLE "PaymentTransaction" ADD COLUMN "stripeInvoiceId" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN "stripeLastEventCreatedAt" INTEGER;

CREATE UNIQUE INDEX "PaymentTransaction_stripeInvoiceId_key" ON "PaymentTransaction"("stripeInvoiceId");
CREATE UNIQUE INDEX "PaymentTransaction_stripePaymentIntentId_key" ON "PaymentTransaction"("stripePaymentIntentId");

CREATE TABLE "StripeWebhookEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "stripeEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" DATETIME,
  "lastError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");
CREATE INDEX "StripeWebhookEvent_status_receivedAt_idx" ON "StripeWebhookEvent"("status", "receivedAt");
