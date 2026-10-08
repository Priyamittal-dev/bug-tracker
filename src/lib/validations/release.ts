import { z } from "zod";

export const releaseStatusEnum = z.enum(["UNRELEASED", "RELEASED", "ARCHIVED"]);

export const createReleaseSchema = z.object({
  version: z.string().min(1, "Version is required").max(50).trim(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  description: z.string().max(2000).optional(),
  releaseDate: z.string().datetime().or(z.date()).optional(),
  releaseNotes: z.string().max(20000).optional(),
});

export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;

export const updateReleaseSchema = z.object({
  version: z.string().min(1).max(50).trim().optional(),
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(2000).nullable().optional(),
  releaseDate: z.string().datetime().or(z.date()).nullable().optional(),
  status: releaseStatusEnum.optional(),
  releaseNotes: z.string().max(20000).nullable().optional(),
});

export type UpdateReleaseInput = z.infer<typeof updateReleaseSchema>;
