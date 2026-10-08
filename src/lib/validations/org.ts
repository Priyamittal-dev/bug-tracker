import { z } from "zod";

export const VALID_ROLES = [
  "ORGANIZATION_OWNER",
  "ORGANIZATION_ADMIN",
  "PROJECT_ADMIN",
  "PROJECT_MANAGER",
  "DEVELOPER",
  "QA_ENGINEER",
  "PRODUCT_MANAGER",
  "REPORTER",
  "VIEWER",
  "GUEST",
  // Legacy aliases
  "OWNER",
  "ADMIN",
  "MEMBER",
] as const;

export const createOrgSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(50)
    .trim(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must only contain lowercase letters, numbers, and hyphens",
    )
    .optional(),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;

export const updateOrgSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(50)
    .trim()
    .optional(),
  logoUrl: z.string().url("Must be a valid URL").optional().nullable(),
});

export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;

export const switchOrgSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
});

export type SwitchOrgInput = z.infer<typeof switchOrgSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email("Valid email required").toLowerCase().trim(),
  role: z.enum(VALID_ROLES).default("DEVELOPER"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(VALID_ROLES),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
