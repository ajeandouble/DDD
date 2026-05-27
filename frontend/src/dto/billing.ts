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

export const InvoiceLineItemSchema = z.object({
  conversation_id: z.string().uuid(),
  duration_seconds: z.number(),
  tokens_consumed: z.number(),
});

export const InvoiceResponseSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  period_start: z.string(),
  period_end: z.string(),
  line_items: z.array(InvoiceLineItemSchema),
  total_tokens: z.number(),
  generated_at: z.string(),
});

export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>;
