import crypto from "crypto";

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function luhnValid(pan: string): boolean {
  const digits = digitsOnly(pan);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function detectCardBrand(pan: string): CardBrand {
  const digits = digitsOnly(pan);
  if (/^3[47]/.test(digits)) return "amex";
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  return "unknown";
}

export function fingerprintSecret(parts: string[]): string {
  return crypto.createHash("sha256").update(parts.join(":")).digest("hex");
}

export function tokenizeCard(input: {
  organizationId: string;
  pan: string;
  cvc: string;
  expMonth: number;
  expYear: number;
  holderName: string;
}) {
  const pan = digitsOnly(input.pan);
  const cvc = digitsOnly(input.cvc);
  if (!luhnValid(pan)) {
    throw Object.assign(new Error("Invalid card number"), {
      code: "CARD_INVALID",
    });
  }
  const brand = detectCardBrand(pan);
  const cvcLen = brand === "amex" ? 4 : 3;
  if (cvc.length !== cvcLen) {
    throw Object.assign(new Error("Invalid security code"), {
      code: "CVC_INVALID",
    });
  }
  const now = new Date();
  const year = input.expYear < 100 ? 2000 + input.expYear : input.expYear;
  if (
    input.expMonth < 1 ||
    input.expMonth > 12 ||
    year < now.getFullYear() ||
    (year === now.getFullYear() && input.expMonth < now.getMonth() + 1)
  ) {
    throw Object.assign(new Error("Card is expired"), { code: "CARD_EXPIRED" });
  }

  return {
    type: "CARD" as const,
    brand,
    last4: pan.slice(-4),
    expMonth: input.expMonth,
    expYear: year,
    holderName: input.holderName.trim(),
    fingerprint: fingerprintSecret([input.organizationId, "CARD", pan]),
  };
}

export function tokenizeBankAccount(input: {
  organizationId: string;
  type: "ACH" | "SEPA_DEBIT";
  accountNumber: string;
  routingNumber?: string;
  iban?: string;
  holderName: string;
  bankName?: string;
}) {
  const account = digitsOnly(input.accountNumber);
  if (account.length < 6) {
    throw Object.assign(new Error("Invalid account number"), {
      code: "BANK_INVALID",
    });
  }
  if (input.type === "ACH") {
    const routing = digitsOnly(input.routingNumber || "");
    if (routing.length !== 9) {
      throw Object.assign(new Error("Invalid ABA routing number"), {
        code: "ROUTING_INVALID",
      });
    }
  }
  if (input.type === "SEPA_DEBIT") {
    const iban = (input.iban || "").replace(/\s/g, "").toUpperCase();
    if (iban.length < 15) {
      throw Object.assign(new Error("Invalid IBAN"), { code: "IBAN_INVALID" });
    }
  }
  return {
    type: input.type,
    brand: "bank" as const,
    last4: account.slice(-4),
    holderName: input.holderName.trim(),
    bankName: input.bankName?.trim() || null,
    fingerprint: fingerprintSecret([
      input.organizationId,
      input.type,
      account,
      input.routingNumber || input.iban || "",
    ]),
  };
}
