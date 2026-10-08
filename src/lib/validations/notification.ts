import { z } from "zod";

export const notificationTypeEnum = z.enum([
  "ISSUE_CREATED",
  "ISSUE_UPDATED",
  "ISSUE_ASSIGNED",
  "ISSUE_STATUS_CHANGED",
  "ISSUE_COMMENTED",
  "WATCHER_ADDED",
]);

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
  unreadOnly: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default(false),
});

export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;

export const markAllReadSchema = z.object({}).strict();

export type MarkAllReadInput = z.infer<typeof markAllReadSchema>;
