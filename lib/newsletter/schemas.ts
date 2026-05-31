import { z } from "zod";

export const subscribeSchema = z.object({
  email: z.string().email().max(254),
  locale: z.string().min(2).max(5).default("en"),
});

export type SubscribePayload = z.infer<typeof subscribeSchema>;
