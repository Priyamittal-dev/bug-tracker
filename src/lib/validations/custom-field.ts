import { z } from "zod";

export const customFieldTypeEnum = z.enum([
  "TEXT",
  "NUMBER",
  "DATE",
  "DROPDOWN",
  "MULTI_SELECT",
  "CHECKBOX",
  "USER",
  "URL",
  "EMAIL",
  "FORMULA",
]);

export const createCustomFieldSchema = z.object({
  name: z
    .string()
    .min(2, "Field name must be at least 2 characters")
    .max(100)
    .trim(),
  fieldKey: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[a-z0-9_]+$/,
      "Field key must be lowercase alphanumeric with underscores",
    ),
  type: customFieldTypeEnum,
  description: z.string().max(500).optional(),
  options: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
  isRequired: z.boolean().default(false),
});

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;

export const setCustomFieldValueSchema = z.object({
  customFieldId: z.string().min(1, "Custom field ID is required"),
  value: z.string().nullable(),
});

export type SetCustomFieldValueInput = z.infer<
  typeof setCustomFieldValueSchema
>;
