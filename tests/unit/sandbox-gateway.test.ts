import { describe, expect, it } from "vitest";
import {
  SANDBOX_TEST_CARDS,
  sandboxGateway,
} from "@/lib/billing/sandbox-gateway";

describe("Unit: Payment Gateway Sandbox Mode", () => {
  it("provides well-known test cards covering approval and failure edge cases", () => {
    expect(SANDBOX_TEST_CARDS.length).toBeGreaterThanOrEqual(5);

    const successCard = SANDBOX_TEST_CARDS.find((c) => c.last4 === "4242");
    expect(successCard).toBeDefined();
    expect(successCard?.expectedOutcome).toBe("SUCCEEDED");

    const declinedCard = SANDBOX_TEST_CARDS.find((c) => c.last4 === "0002");
    expect(declinedCard).toBeDefined();
    expect(declinedCard?.expectedOutcome).toBe("FAILED");

    const insufficientFundsCard = SANDBOX_TEST_CARDS.find((c) => c.last4 === "0069");
    expect(insufficientFundsCard).toBeDefined();
    expect(insufficientFundsCard?.expectedOutcome).toBe("FAILED");
  });

  it("approves standard test visa card 4242", async () => {
    const result = await sandboxGateway.processCharge({
      organizationId: "org_test",
      billingAccountId: "ba_test",
      amountCents: 1200,
      currency: "USD",
      description: "Team subscription",
      paymentMethodType: "CARD",
      last4: "4242",
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("SUCCEEDED");
    expect(result.gatewayTransactionId).toMatch(/^ch_test_/);
    expect(result.amountCents).toBe(1200);
  });

  it("deterministically declines test card 0002", async () => {
    const result = await sandboxGateway.processCharge({
      organizationId: "org_test",
      billingAccountId: "ba_test",
      amountCents: 1200,
      currency: "USD",
      description: "Declined charge test",
      paymentMethodType: "CARD",
      last4: "0002",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("declined");
    expect(result.gatewayResponseCode).toBe("card_declined");
  });

  it("deterministically rejects insufficient funds card 0069", async () => {
    const result = await sandboxGateway.processCharge({
      organizationId: "org_test",
      billingAccountId: "ba_test",
      amountCents: 5000,
      currency: "USD",
      description: "Insufficient balance test",
      paymentMethodType: "CARD",
      last4: "0069",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toContain("insufficient funds");
    expect(result.gatewayResponseCode).toBe("insufficient_funds");
  });

  it("deterministically rejects expired card 0127 and bad cvc 0028", async () => {
    const expiredResult = await sandboxGateway.processCharge({
      organizationId: "org_test",
      billingAccountId: "ba_test",
      amountCents: 2000,
      currency: "USD",
      description: "Expired card test",
      paymentMethodType: "CARD",
      last4: "0127",
    });
    expect(expiredResult.success).toBe(false);
    expect(expiredResult.failureReason).toContain("expired");

    const cvcResult = await sandboxGateway.processCharge({
      organizationId: "org_test",
      billingAccountId: "ba_test",
      amountCents: 2000,
      currency: "USD",
      description: "CVC test",
      paymentMethodType: "CARD",
      last4: "0028",
    });
    expect(cvcResult.success).toBe(false);
    expect(cvcResult.failureReason).toContain("security code");
  });

  it("processes refunds in sandbox mode", async () => {
    const refund = await sandboxGateway.processRefund({
      organizationId: "org_test",
      originalTransactionId: "tx_orig",
      originalGatewayTransactionId: "ch_test_12345",
      amountCents: 1200,
      currency: "USD",
      reason: "Customer requested",
    });

    expect(refund.success).toBe(true);
    expect(refund.status).toBe("REFUNDED");
    expect(refund.refundGatewayId).toMatch(/^re_test_/);
    expect(refund.refundedAmountCents).toBe(1200);
  });
});
