import { z } from "zod";
import { issuePriorityEnum, issueStatusEnum } from "./issue";

export const createEpicSchema = z.object({
  title: z
    .string()
    .min(2, "Epic title must be at least 2 characters")
    .max(255)
    .trim(),
  description: z.string().max(30000).optional(),
  priority: issuePriorityEnum.default("HIGH").optional(),
  status: issueStatusEnum.default("TODO").optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  targetDate: z.string().datetime().or(z.date()).optional(),
  assigneeId: z.string().nullable().optional(),
  labelIds: z.array(z.string()).optional(),
});

export type CreateEpicInput = z.infer<typeof createEpicSchema>;

export const updateEpicSchema = z.object({
  title: z.string().min(2).max(255).trim().optional(),
  description: z.string().max(30000).optional(),
  priority: issuePriorityEnum.optional(),
  status: issueStatusEnum.optional(),
  startDate: z.string().datetime().or(z.date()).nullable().optional(),
  targetDate: z.string().datetime().or(z.date()).nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  labelIds: z.array(z.string()).optional(),
});

export type UpdateEpicInput = z.infer<typeof updateEpicSchema>;

export const assignEpicIssuesSchema = z.object({
  issueIds: z.array(z.string()).min(1, "At least one issue ID is required"),
});

export type AssignEpicIssuesInput = z.infer<typeof assignEpicIssuesSchema>;
