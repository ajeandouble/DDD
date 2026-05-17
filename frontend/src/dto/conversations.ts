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

export const TranscriptWord = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
});
export type TranscriptWord = z.infer<typeof TranscriptWord>;

export const SpeakerTurn = z.object({
  speaker: z.string(),
  text: z.string(),
  words: z.array(TranscriptWord).default([]),
});
export type SpeakerTurn = z.infer<typeof SpeakerTurn>;

export const ConversationResponse = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.union([z.string(), z.array(SpeakerTurn)]),
  type: z.enum(["review", "conversation"]),
  conversation_timestamp: z.string(),
  created_at: z.string(),
  metadata: z.array(MetadataEntry),
  created_by: z.string().uuid(),
  organization_id: z.string().uuid().nullable(),
  scope_id: z.string().uuid().nullable(),
  scope_type: ScopeType,
  tag_ids: z.array(z.string().uuid()),
  stats: ConversationStats,
});

export const ConversationCreateRequest = z.object({
  title: z.string().min(1),
  content: z.union([z.string(), z.array(z.object({ speaker: z.string(), text: z.string(), words: z.array(z.object({ word: z.string(), start: z.number(), end: z.number() })).optional() }))]),
  type: z.enum(["review", "conversation"]).default("review"),
  conversation_timestamp: z.string().optional(),
  metadata: z.array(MetadataEntry).default([]),
  organization_id: z.string().uuid().nullable().optional(),
  scope_id: z.string().uuid().nullable().optional(),
  scope_type: ScopeType.optional(),
});

export const ConversationUpdateRequest = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  metadata: z.array(MetadataEntry).optional(),
});

export type MetadataEntry = z.infer<typeof MetadataEntry>;
export type ConversationStats = z.infer<typeof ConversationStats>;
export type ConversationResponse = z.infer<typeof ConversationResponse>;
export type ConversationCreateRequest = z.infer<typeof ConversationCreateRequest>;
export type ConversationUpdateRequest = z.infer<typeof ConversationUpdateRequest>;
export type ScopeType = z.infer<typeof ScopeType>;
