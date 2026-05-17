import { z } from "zod";

export const SubscriptionResponseSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  tier: z.enum(["starter", "pro", "enterprise"]),
  tokens_used: z.number(),
  tokens_remaining: z.number().nullable(),
  reset_at: z.string(),
  period_start: z.string(),
});

export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;

export const UsageRecordResponseSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  duration_seconds: z.number(),
  tokens_consumed: z.number(),
  created_at: z.string(),
});

export type UsageRecordResponse = z.infer<typeof UsageRecordResponseSchema>;
