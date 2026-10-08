import { z } from "zod";

export const logTimeSchema = z.object({
  timeSpent: z
    .number()
    .min(0.1, "Minimum log time is 0.1 hours (6 mins)")
    .max(24, "Maximum 24 hours per log"),
  description: z.string().max(1000).optional(),
  billable: z.boolean().default(true),
  loggedAt: z.string().datetime().or(z.date()).optional(),
  startedAt: z.string().datetime().or(z.date()).optional(),
  endedAt: z.string().datetime().or(z.date()).optional(),
});

export type LogTimeInput = z.infer<typeof logTimeSchema>;
