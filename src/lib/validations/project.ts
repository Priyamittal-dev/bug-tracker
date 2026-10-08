import { z } from "zod";

export const projectKeyValidation = z
  .string()
  .min(2, "Project key must be at least 2 characters")
  .max(10, "Project key must not exceed 10 characters")
  .regex(
    /^[A-Z][A-Z0-9]*$/,
    "Project key must start with an uppercase letter and contain only uppercase letters and numbers",
  );

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(2, "Project name must be at least 2 characters")
    .max(80)
    .trim(),
  key: projectKeyValidation,
  description: z.string().max(2000).optional(),
  category: z.string().max(50).default("Software Development").optional(),
  projectType: z
    .enum(["SOFTWARE", "SERVICE_DESK", "BUSINESS"])
    .default("SOFTWARE")
    .optional(),
  teamId: z.string().optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  targetDate: z.string().datetime().or(z.date()).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(80).trim().optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
  projectType: z.enum(["SOFTWARE", "SERVICE_DESK", "BUSINESS"]).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]).optional(),
  ownerId: z.string().optional(),
  teamId: z.string().nullable().optional(),
  startDate: z.string().datetime().or(z.date()).nullable().optional(),
  targetDate: z.string().datetime().or(z.date()).nullable().optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectMemberRoleEnum = z.enum([
  "PROJECT_ADMIN",
  "PROJECT_MANAGER",
  "DEVELOPER",
  "QA_ENGINEER",
  "REPORTER",
  "VIEWER",
]);

export const addProjectMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: projectMemberRoleEnum.default("DEVELOPER"),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;

export const updateProjectMemberRoleSchema = z.object({
  role: projectMemberRoleEnum,
});

export type UpdateProjectMemberRoleInput = z.infer<
  typeof updateProjectMemberRoleSchema
>;
