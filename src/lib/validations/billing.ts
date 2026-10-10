import { z } from "zod";

export const planKeySchema = z.enum(["FREE", "TEAM", "BUSINESS", "ENTERPRISE"]);
export const billingIntervalSchema = z.enum(["MONTHLY", "YEARLY"]);
export const collectionMethodSchema = z.enum([
  "CHARGE_AUTOMATICALLY",
  "SEND_INVOICE",
]);

export const addCardSchema = z.object({
  type: z.literal("CARD"),
  pan: z.string().min(13).max(23),
  cvc: z.string().min(3).max(4),
  expMonth: z.coerce.number().int().min(1).max(12),
  expYear: z.coerce.number().int().min(2024).max(2045),
  holderName: z.string().trim().min(2).max(80),
  billingCountry: z.string().trim().min(2).max(2).default("US"),
  setDefault: z.boolean().optional().default(true),
});

export const addAchSchema = z.object({
  type: z.literal("ACH"),
  accountNumber: z.string().min(6).max(17),
  routingNumber: z.string().min(9).max(9),
  holderName: z.string().trim().min(2).max(80),
  bankName: z.string().trim().min(2).max(80).optional(),
  billingCountry: z.string().trim().min(2).max(2).default("US"),
  setDefault: z.boolean().optional().default(false),
});

export const addSepaSchema = z.object({
  type: z.literal("SEPA_DEBIT"),
  accountNumber: z.string().min(6).max(34),
  iban: z.string().min(15).max(34),
  holderName: z.string().trim().min(2).max(80),
  bankName: z.string().trim().min(2).max(80).optional(),
  billingCountry: z.string().trim().min(2).max(2).default("DE"),
  setDefault: z.boolean().optional().default(false),
});

export const addInvoiceSchema = z.object({
  type: z.enum(["INVOICE", "WIRE"]),
  poNumber: z.string().trim().min(3).max(40),
  holderName: z.string().trim().min(2).max(80),
  billingCountry: z.string().trim().min(2).max(2).default("US"),
  setDefault: z.boolean().optional().default(false),
});

export const addPaymentMethodSchema = z.discriminatedUnion("type", [
  addCardSchema,
  addAchSchema,
  addSepaSchema,
  addInvoiceSchema,
]);

export const changePlanSchema = z.object({
  planKey: planKeySchema,
  billingInterval: billingIntervalSchema.default("MONTHLY"),
  seatQuantity: z.coerce.number().int().min(1).max(5000).optional(),
});

export const updateBillingProfileSchema = z.object({
  billingEmail: z.string().email(),
  companyName: z.string().trim().min(2).max(120).optional().nullable(),
  taxId: z.string().trim().max(40).optional().nullable(),
  taxIdType: z
    .enum(["VAT", "GST", "EIN", "ABN", "GSTIN"])
    .optional()
    .nullable(),
  addressLine1: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  region: z.string().trim().max(80).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().min(2).max(2).optional(),
  collectionMethod: collectionMethodSchema.optional(),
  poNumber: z.string().trim().max(40).optional().nullable(),
  netTermsDays: z.coerce.number().int().min(0).max(90).optional(),
});

export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
export type UpdateBillingProfileInput = z.infer<
  typeof updateBillingProfileSchema
>;

export const refundTransactionSchema = z.object({
  transactionId: z.string().min(1),
  amountCents: z.coerce.number().int().positive().optional(),
  reason: z.string().trim().max(250).optional(),
});

export const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
  reason: z.string().trim().max(250).optional(),
});

export const payInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  paymentMethodId: z.string().optional(),
});

export const voidInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().trim().max(250).optional(),
});

export type RefundTransactionInput = z.infer<typeof refundTransactionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;
export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>;

