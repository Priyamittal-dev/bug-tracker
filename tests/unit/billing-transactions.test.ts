import { describe, expect, it } from "vitest";
import {
  cancelSubscriptionSchema,
  payInvoiceSchema,
  refundTransactionSchema,
  voidInvoiceSchema,
} from "@/lib/validations/billing";

describe("Unit: Billing & Payment Validations", () => {
  it("validates refund requests with positive amounts and reasons", () => {
    const valid = refundTransactionSchema.safeParse({
      transactionId: "tx_123",
      amountCents: 1500,
      reason: "Accidental double-charge",
    });
    expect(valid.success).toBe(true);

    const invalidNegative = refundTransactionSchema.safeParse({
      transactionId: "tx_123",
      amountCents: -500,
    });
    expect(invalidNegative.success).toBe(false);

    const missingId = refundTransactionSchema.safeParse({
      transactionId: "",
      amountCents: 500,
    });
    expect(missingId.success).toBe(false);
  });

  it("validates subscription cancellation parameters", () => {
    const defaultCancel = cancelSubscriptionSchema.safeParse({});
    expect(defaultCancel.success).toBe(true);
    if (defaultCancel.success) {
      expect(defaultCancel.data.cancelAtPeriodEnd).toBe(true);
    }

    const immediateCancel = cancelSubscriptionSchema.safeParse({
      cancelAtPeriodEnd: false,
      reason: "Downsizing organization",
    });
    expect(immediateCancel.success).toBe(true);
    if (immediateCancel.success) {
      expect(immediateCancel.data.cancelAtPeriodEnd).toBe(false);
      expect(immediateCancel.data.reason).toBe("Downsizing organization");
    }
  });

  it("validates pay and void invoice requests", () => {
    const pay = payInvoiceSchema.safeParse({
      invoiceId: "inv_99",
      paymentMethodId: "pm_44",
    });
    expect(pay.success).toBe(true);

    const voidReq = voidInvoiceSchema.safeParse({
      invoiceId: "inv_99",
      reason: "Issued in error",
    });
    expect(voidReq.success).toBe(true);

    const invalidVoid = voidInvoiceSchema.safeParse({
      invoiceId: "",
    });
    expect(invalidVoid.success).toBe(false);
  });
});
