import { z } from "zod";

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  owner_id: z.string().uuid(),
  member_ids: z.array(z.string().uuid()),
  created_at: z.string(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  organization_id: z.string().uuid(),
  created_at: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const SubprojectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  project_id: z.string().uuid(),
  created_at: z.string(),
});

export type Subproject = z.infer<typeof SubprojectSchema>;

export const CampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  parent_type: z.enum(["organization", "project", "subproject"]),
  parent_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  created_at: z.string(),
});

export type Campaign = z.infer<typeof CampaignSchema>;
