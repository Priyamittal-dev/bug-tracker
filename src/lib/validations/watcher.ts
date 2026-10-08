import { z } from "zod";

export const addWatcherSchema = z.object({
  userId: z.string().min(1, "User id is required"),
});

export type AddWatcherInput = z.infer<typeof addWatcherSchema>;

export const listWatchedIssuesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export type ListWatchedIssuesQuery = z.infer<
  typeof listWatchedIssuesQuerySchema
>;
