import crypto from "crypto";
import { logger } from "@/lib/logger";

export type GatewayTransactionStatus =
  | "SUCCEEDED"
  | "PENDING"
  | "PROCESSING"
  | "FAILED"
  | "REFUNDED";

export type GatewayTransactionType = "CHARGE" | "REFUND" | "VERIFICATION";

export interface SandboxTestCard {
  brand: string;
  pan: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  label: string;
  expectedOutcome: "SUCCEEDED" | "FAILED";
  description: string;
}

export const SANDBOX_TEST_CARDS: SandboxTestCard[] = [
  {
    brand: "Visa",
    pan: "4242 4242 4242 4242",
    last4: "4242",
    expMonth: 12,
    expYear: 2029,
    cvc: "123",
    label: "Success (Visa)",
    expectedOutcome: "SUCCEEDED",
    description: "Successful standard payment authorization & capture",
  },
  {
    brand: "Mastercard",
    pan: "5555 5555 5555 4444",
    last4: "4444",
    expMonth: 10,
    expYear: 2028,
    cvc: "456",
    label: "Success (Mastercard)",
    expectedOutcome: "SUCCEEDED",
    description: "Successful high-value corporate authorization",
  },
  {
    brand: "American Express",
    pan: "3782 8224 6310 005",
    last4: "0005",
    expMonth: 8,
    expYear: 2030,
    cvc: "1234",
    label: "Success (Amex)",
    expectedOutcome: "SUCCEEDED",
    description: "Successful corporate purchasing card",
  },
  {
    brand: "Visa",
    pan: "4000 0000 0000 0002",
    last4: "0002",
    expMonth: 12,
    expYear: 2029,
    cvc: "123",
    label: "Declined Card",
    expectedOutcome: "FAILED",
    description: "Simulates issuer generic card decline",
  },
  {
    brand: "Visa",
    pan: "4000 0000 0000 0069",
    last4: "0069",
    expMonth: 12,
    expYear: 2029,
    cvc: "123",
    label: "Insufficient Funds",
    expectedOutcome: "FAILED",
    description: "Simulates cardholder credit limit or balance exceeded",
  },
  {
    brand: "Visa",
    pan: "4000 0000 0000 0127",
    last4: "0127",
    expMonth: 12,
    expYear: 2029,
    cvc: "123",
    label: "Expired Card",
    expectedOutcome: "FAILED",
    description: "Simulates expired instrument response",
  },
  {
    brand: "Visa",
    pan: "4000 0000 0000 0028",
    last4: "0028",
    expMonth: 12,
    expYear: 2029,
    cvc: "999",
    label: "Incorrect CVC",
    expectedOutcome: "FAILED",
    description: "Simulates security code mismatch",
  },
];

export interface ChargeRequest {
  organizationId: string;
  billingAccountId: string;
  invoiceId?: string;
  paymentMethodId?: string;
  amountCents: number;
  currency: string;
  description: string;
  paymentMethodType: string;
  last4: string;
  metadata?: Record<string, unknown>;
}

export interface ChargeResult {
  success: boolean;
  status: GatewayTransactionStatus;
  gatewayTransactionId: string;
  gatewayResponseCode: string;
  failureReason?: string;
  amountCents: number;
  currency: string;
}

export interface RefundRequest {
  organizationId: string;
  originalTransactionId: string;
  originalGatewayTransactionId: string;
  amountCents: number;
  currency: string;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  status: GatewayTransactionStatus;
  refundGatewayId: string;
  gatewayResponseCode: string;
  failureReason?: string;
  refundedAmountCents: number;
}

export class SandboxPaymentGateway {
  readonly gatewayName = "STRIPE_SANDBOX";
  readonly isSandbox = true;

  generateId(prefix: string): string {
    return `${prefix}_test_${crypto.randomBytes(12).toString("hex")}`;
  }

  /**
   * Process a payment in sandbox mode. Evaluates instrument characteristics deterministically.
   */
  async processCharge(req: ChargeRequest): Promise<ChargeResult> {
    const txId = this.generateId("ch");

    if (req.amountCents <= 0) {
      return {
        success: true,
        status: "SUCCEEDED",
        gatewayTransactionId: txId,
        gatewayResponseCode: "200_OK_ZERO_AMOUNT",
        amountCents: req.amountCents,
        currency: req.currency,
      };
    }

    // ACH failure simulation
    if (req.paymentMethodType === "ACH" && req.last4 === "9999") {
      logger.warn("Sandbox Gateway: ACH account rejected", {
        organizationId: req.organizationId,
        last4: req.last4,
      });
      return {
        success: false,
        status: "FAILED",
        gatewayTransactionId: txId,
        gatewayResponseCode: "ach_return_r03",
        failureReason: "ACH return: No account / unable to locate account (R03)",
        amountCents: req.amountCents,
        currency: req.currency,
      };
    }

    // Deterministic Card behavior based on last4
    if (req.paymentMethodType === "CARD") {
      switch (req.last4) {
        case "0002":
          return {
            success: false,
            status: "FAILED",
            gatewayTransactionId: txId,
            gatewayResponseCode: "card_declined",
            failureReason:
              "Your card was declined. Please try another card or contact your bank.",
            amountCents: req.amountCents,
            currency: req.currency,
          };
        case "0069":
          return {
            success: false,
            status: "FAILED",
            gatewayTransactionId: txId,
            gatewayResponseCode: "insufficient_funds",
            failureReason:
              "Your card has insufficient funds to complete this transaction.",
            amountCents: req.amountCents,
            currency: req.currency,
          };
        case "0127":
          return {
            success: false,
            status: "FAILED",
            gatewayTransactionId: txId,
            gatewayResponseCode: "expired_card",
            failureReason:
              "Your card has expired. Please check the expiration date or use another card.",
            amountCents: req.amountCents,
            currency: req.currency,
          };
        case "0028":
          return {
            success: false,
            status: "FAILED",
            gatewayTransactionId: txId,
            gatewayResponseCode: "incorrect_cvc",
            failureReason:
              "The security code (CVC) provided does not match your card.",
            amountCents: req.amountCents,
            currency: req.currency,
          };
        case "3022":
          return {
            success: false,
            status: "FAILED",
            gatewayTransactionId: txId,
            gatewayResponseCode: "authentication_required",
            failureReason:
              "Card issuer requires 3D Secure customer authentication.",
            amountCents: req.amountCents,
            currency: req.currency,
          };
        default:
          break;
      }
    }

    logger.info("Sandbox Gateway: Charge approved", {
      organizationId: req.organizationId,
      gatewayTransactionId: txId,
      amountCents: req.amountCents,
      currency: req.currency,
    });

    return {
      success: true,
      status: "SUCCEEDED",
      gatewayTransactionId: txId,
      gatewayResponseCode: "charge_captured",
      amountCents: req.amountCents,
      currency: req.currency,
    };
  }

  /**
   * Process a refund in sandbox mode.
   */
  async processRefund(req: RefundRequest): Promise<RefundResult> {
    const refundId = this.generateId("re");

    if (req.amountCents <= 0) {
      return {
        success: false,
        status: "FAILED",
        refundGatewayId: refundId,
        gatewayResponseCode: "invalid_refund_amount",
        failureReason: "Refund amount must be greater than zero.",
        refundedAmountCents: 0,
      };
    }

    logger.info("Sandbox Gateway: Refund processed", {
      organizationId: req.organizationId,
      refundGatewayId: refundId,
      originalGatewayTx: req.originalGatewayTransactionId,
      amountCents: req.amountCents,
    });

    return {
      success: true,
      status: "REFUNDED",
      refundGatewayId: refundId,
      gatewayResponseCode: "refund_succeeded",
      refundedAmountCents: req.amountCents,
    };
  }
}

export const sandboxGateway = new SandboxPaymentGateway();
