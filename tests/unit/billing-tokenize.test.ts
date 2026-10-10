import { describe, expect, it } from "vitest";
import {
  detectCardBrand,
  luhnValid,
  tokenizeBankAccount,
  tokenizeCard,
} from "@/lib/billing/tokenize";
import { quotePlan } from "@/lib/billing/plans";

describe("Unit: PCI-safe billing tokenization", () => {
  it("validates Luhn and brands common test cards", () => {
    expect(luhnValid("4242424242424242")).toBe(true);
    expect(luhnValid("4111111111111112")).toBe(false);
    expect(detectCardBrand("4242424242424242")).toBe("visa");
    expect(detectCardBrand("5555555555554444")).toBe("mastercard");
    expect(detectCardBrand("378282246310005")).toBe("amex");
  });

  it("returns last4 and fingerprint without echoing the PAN", () => {
    const token = tokenizeCard({
      organizationId: "org_1",
      pan: "4242 4242 4242 4242",
      cvc: "123",
      expMonth: 12,
      expYear: 2030,
      holderName: "Ada Lovelace",
    });
    expect(token.last4).toBe("4242");
    expect(token.brand).toBe("visa");
    expect(JSON.stringify(token)).not.toContain("4242424242424242");
    expect(token.fingerprint).toHaveLength(64);
  });

  it("tokenizes ACH routing/account pairs", () => {
    const token = tokenizeBankAccount({
      organizationId: "org_1",
      type: "ACH",
      accountNumber: "000123456789",
      routingNumber: "021000021",
      holderName: "CloudDesk Treasury",
      bankName: "Chase",
    });
    expect(token.last4).toBe("6789");
    expect(token.type).toBe("ACH");
  });

  it("quotes extra seats on paid plans", () => {
    const quote = quotePlan("TEAM", "MONTHLY", 14);
    expect(quote.extraSeats).toBe(4);
    expect(quote.subtotalCents).toBe(1200 + 4 * 800);
  });
});
