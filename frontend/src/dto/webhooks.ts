import { z } from "zod";

export const WebhookEndpoint = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  url: z.string(),
  secret: z.string(),
  event_types: z.array(z.string()),
  transformer: z.string(),
  enabled: z.boolean(),
  trigger_scope: z.string().nullable(),
  trigger_scope_id: z.string().uuid().nullable(),
  created_at: z.string(),
});

export const Delivery = z.object({
  id: z.string().uuid(),
  endpoint_id: z.string().uuid(),
  event_type: z.string(),
  payload_sent: z.record(z.string(), z.unknown()),
  status: z.string(),
  response_code: z.number().nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
});

export type WebhookEndpoint = z.infer<typeof WebhookEndpoint>;
export type Delivery = z.infer<typeof Delivery>;
