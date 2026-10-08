import { z } from "zod";

export const issueTypeEnum = z.enum([
  "EPIC",
  "STORY",
  "TASK",
  "BUG",
  "SUBTASK",
  "FEATURE",
  "IMPROVEMENT",
  "SUPPORT_TICKET",
  "CHANGE_REQUEST",
]);

export const issuePriorityEnum = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "LOWEST",
]);

export const issueStatusEnum = z.enum([
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "CODE_REVIEW",
  "QA",
  "DONE",
  "REOPENED",
  "DUPLICATE",
  "REJECTED",
  "WONT_FIX",
  "CANNOT_REPRODUCE",
  "CLOSED",
]);

export const bugSeverityEnum = z.enum([
  "BLOCKER",
  "CRITICAL",
  "MAJOR",
  "MINOR",
  "TRIVIAL",
]);

export const relationshipTypeEnum = z.enum([
  "PARENT_CHILD",
  "BLOCKS",
  "BLOCKED_BY",
  "RELATES_TO",
  "DUPLICATE",
  "DUPLICATED_BY",
]);

export const createIssueSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(255)
    .trim(),
  description: z.string().max(30000).optional(),
  type: issueTypeEnum.default("TASK").optional(),
  priority: issuePriorityEnum.default("MEDIUM").optional(),
  status: issueStatusEnum.default("TODO").optional(),
  severity: bugSeverityEnum.optional(),
  teamId: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  parentIssueId: z.string().nullable().optional(),
  milestoneId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  epicId: z.string().nullable().optional(),
  storyPoints: z.number().min(0).max(100).nullable().optional(),
  startDate: z.string().datetime().or(z.date()).nullable().optional(),
  targetDate: z.string().datetime().or(z.date()).nullable().optional(),
  estimate: z.number().min(0).max(1000).optional(),
  dueDate: z.string().datetime().or(z.date()).nullable().optional(),

  // Specialized Bug Fields
  environment: z.string().max(100).optional(),
  module: z.string().max(100).optional(),
  reproducibility: z.string().max(100).optional(),
  operatingSystem: z.string().max(100).optional(),
  browser: z.string().max(100).optional(),
  device: z.string().max(100).optional(),
  appVersion: z.string().max(50).optional(),
  stepsToReproduce: z.string().max(10000).optional(),
  expectedResult: z.string().max(5000).optional(),
  actualResult: z.string().max(5000).optional(),
  logs: z.string().max(20000).optional(),
  stackTrace: z.string().max(20000).optional(),
  component: z.string().max(100).optional(),

  labelIds: z.array(z.string()).optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const updateIssueSchema = z.object({
  title: z.string().min(2).max(255).trim().optional(),
  description: z.string().max(30000).optional(),
  type: issueTypeEnum.optional(),
  status: issueStatusEnum.optional(),
  priority: issuePriorityEnum.optional(),
  severity: bugSeverityEnum.nullable().optional(),
  teamId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  parentIssueId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  epicId: z.string().nullable().optional(),
  storyPoints: z.number().min(0).max(100).nullable().optional(),
  startDate: z.string().datetime().or(z.date()).nullable().optional(),
  targetDate: z.string().datetime().or(z.date()).nullable().optional(),
  estimate: z.number().min(0).max(1000).nullable().optional(),
  timeSpent: z.number().min(0).max(10000).nullable().optional(),
  dueDate: z.string().datetime().or(z.date()).nullable().optional(),

  environment: z.string().max(100).nullable().optional(),
  module: z.string().max(100).nullable().optional(),
  reproducibility: z.string().max(100).nullable().optional(),
  operatingSystem: z.string().max(100).nullable().optional(),
  browser: z.string().max(100).nullable().optional(),
  device: z.string().max(100).nullable().optional(),
  appVersion: z.string().max(50).nullable().optional(),
  stepsToReproduce: z.string().max(10000).nullable().optional(),
  expectedResult: z.string().max(5000).nullable().optional(),
  actualResult: z.string().max(5000).nullable().optional(),
  logs: z.string().max(20000).nullable().optional(),
  stackTrace: z.string().max(20000).nullable().optional(),
  component: z.string().max(100).nullable().optional(),

  labelIds: z.array(z.string()).optional(),
});

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

export const updateIssueStatusSchema = z.object({
  status: issueStatusEnum,
});

export type UpdateIssueStatusInput = z.infer<typeof updateIssueStatusSchema>;

export const addCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment content cannot be empty")
    .max(10000)
    .trim(),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;

export const addRelationshipSchema = z.object({
  targetIssueId: z.string().min(1, "Target issue is required"),
  type: relationshipTypeEnum,
});

export type AddRelationshipInput = z.infer<typeof addRelationshipSchema>;

export const createLabelSchema = z.object({
  name: z.string().min(1, "Label name is required").max(50).trim(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid 6-character hex code")
    .default("#3b82f6"),
  description: z.string().max(200).optional(),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
