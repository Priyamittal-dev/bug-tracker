import { z } from "zod";

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(50)
    .trim(),
  description: z
    .string()
    .max(250, "Description must be 250 characters or less")
    .optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(50)
    .trim()
    .optional(),
  description: z
    .string()
    .max(250, "Description must be 250 characters or less")
    .optional(),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["MEMBER", "LEAD"]).default("MEMBER"),
});

export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
