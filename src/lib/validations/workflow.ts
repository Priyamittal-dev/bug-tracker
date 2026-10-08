import { z } from "zod";

export const createWorkflowSchema = z.object({
  name: z
    .string()
    .min(2, "Workflow name must be at least 2 characters")
    .max(100)
    .trim(),
  description: z.string().max(1000).optional(),
  isDefault: z.boolean().default(false).optional(),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export const createWorkflowStatusSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  key: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[A-Z0-9_]+$/,
      "Status key must be uppercase alphanumeric/underscores",
    ),
  category: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("IN_PROGRESS"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#3b82f6"),
  order: z.number().int().min(0).default(0),
});

export type CreateWorkflowStatusInput = z.infer<
  typeof createWorkflowStatusSchema
>;

export const createWorkflowTransitionSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  fromStatusId: z.string().nullable().optional(),
  toStatusId: z.string().min(1, "Target status is required"),
  requiredRole: z.string().nullable().optional(),
  validationRules: z.array(z.string()).optional(),
});

export type CreateWorkflowTransitionInput = z.infer<
  typeof createWorkflowTransitionSchema
>;
