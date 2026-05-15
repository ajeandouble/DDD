import { z } from "zod";

export const MetadataEntry = z.object({
  key: z.string(),
  value: z.string(),
});

export const ConversationStats = z.object({
  word_count: z.number().nullable(),
  duration_seconds: z.number().nullable(),
  cost_cents: z.number().nullable(),
});

const ScopeType = z.enum(["organization", "project", "subproject", "campaign"]).nullable();

export const ConversationResponse = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  timestamp: z.string(),
  metadata: z.array(MetadataEntry),
  emit_webhook: z.boolean(),
  created_by: z.string().uuid(),
  organization_id: z.string().uuid().nullable(),
  scope_id: z.string().uuid().nullable(),
  scope_type: ScopeType,
  tag_ids: z.array(z.string().uuid()),
  stats: ConversationStats,
});

export const ConversationCreateRequest = z.object({
  title: z.string().min(1),
  content: z.string(),
  metadata: z.array(MetadataEntry).default([]),
  emit_webhook: z.boolean().default(false),
  organization_id: z.string().uuid().nullable().optional(),
  scope_id: z.string().uuid().nullable().optional(),
  scope_type: ScopeType.optional(),
});

export const ConversationUpdateRequest = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  metadata: z.array(MetadataEntry).optional(),
  emit_webhook: z.boolean().optional(),
});

export type MetadataEntry = z.infer<typeof MetadataEntry>;
export type ConversationStats = z.infer<typeof ConversationStats>;
export type ConversationResponse = z.infer<typeof ConversationResponse>;
export type ConversationCreateRequest = z.infer<typeof ConversationCreateRequest>;
export type ConversationUpdateRequest = z.infer<typeof ConversationUpdateRequest>;
export type ScopeType = z.infer<typeof ScopeType>;
