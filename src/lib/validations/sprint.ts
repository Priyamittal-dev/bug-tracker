import { z } from "zod";

export const sprintStatusEnum = z.enum([
  "PLANNING",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
]);

export const createSprintSchema = z.object({
  name: z
    .string()
    .min(2, "Sprint name must be at least 2 characters")
    .max(100)
    .trim(),
  goal: z.string().max(1000).optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;

export const updateSprintSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  goal: z.string().max(1000).nullable().optional(),
  status: sprintStatusEnum.optional(),
  startDate: z.string().datetime().or(z.date()).nullable().optional(),
  endDate: z.string().datetime().or(z.date()).nullable().optional(),
});

export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;

export const startSprintSchema = z.object({
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()),
});

export type StartSprintInput = z.infer<typeof startSprintSchema>;

export const completeSprintSchema = z.object({
  moveIncompleteTo: z.enum(["BACKLOG", "SPRINT"]).default("BACKLOG"),
  targetSprintId: z.string().optional(),
});

export type CompleteSprintInput = z.infer<typeof completeSprintSchema>;

export const sprintIssueBulkSchema = z.object({
  issueIds: z.array(z.string()).min(1, "At least one issue ID is required"),
});

export type SprintIssueBulkInput = z.infer<typeof sprintIssueBulkSchema>;
