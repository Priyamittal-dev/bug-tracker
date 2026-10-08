import { z } from "zod";

export const automationTriggerEnum = z.enum([
  "issue:created",
  "issue:status_changed",
  "issue:priority_changed",
  "issue:comment_added",
  "sprint:started",
  "sprint:completed",
]);

export const automationConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["equals", "not_equals", "contains", "in"]),
  value: z.any(),
});

export const automationActionSchema = z.object({
  type: z.enum([
    "ASSIGN_USER",
    "CHANGE_STATUS",
    "CHANGE_PRIORITY",
    "ADD_LABEL",
    "ADD_COMMENT",
  ]),
  value: z.string().min(1),
});

export const createAutomationRuleSchema = z.object({
  name: z
    .string()
    .min(2, "Rule name must be at least 2 characters")
    .max(100)
    .trim(),
  description: z.string().max(500).optional(),
  triggerType: automationTriggerEnum,
  conditions: z
    .array(automationConditionSchema)
    .min(1, "At least one condition is required"),
  actions: z
    .array(automationActionSchema)
    .min(1, "At least one action is required"),
  isActive: z.boolean().default(true),
});

export type CreateAutomationRuleInput = z.infer<
  typeof createAutomationRuleSchema
>;
