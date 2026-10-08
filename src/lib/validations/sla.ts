import { z } from "zod";

export const slaTargetSchema = z.object({
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "LOWEST"]),
  responseHours: z.number().min(0.1).max(720),
  resolutionHours: z.number().min(0.5).max(2160),
});

export const createSlaPolicySchema = z.object({
  name: z
    .string()
    .min(2, "Policy name must be at least 2 characters")
    .max(100)
    .trim(),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  targets: z
    .array(slaTargetSchema)
    .min(1, "At least one priority target is required"),
});

export type CreateSlaPolicyInput = z.infer<typeof createSlaPolicySchema>;
