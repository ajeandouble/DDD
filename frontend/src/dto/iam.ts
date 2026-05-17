import { z } from "zod";

export const RoleAssignmentSchema = z.object({
  subject: z.string(),
  role: z.string(),
  scope_type: z.string(),
  scope_id: z.string(),
});

export const UserSummarySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});

export const IamGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  org_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  member_ids: z.array(z.string().uuid()),
  created_at: z.string(),
});

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  key_prefix: z.string(),
  owner_id: z.string().uuid(),
  scope_type: z.string().nullable(),
  scope_id: z.string().uuid().nullable(),
  created_at: z.string(),
});

export const ApiKeyCreatedSchema = ApiKeySchema.extend({ raw_key: z.string() });

export type RoleAssignment = z.infer<typeof RoleAssignmentSchema>;
export type UserSummary = z.infer<typeof UserSummarySchema>;
export type IamGroup = z.infer<typeof IamGroupSchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
export type ApiKeyCreated = z.infer<typeof ApiKeyCreatedSchema>;
