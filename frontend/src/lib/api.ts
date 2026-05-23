import { api, authHeaders } from "./http";
import type { TokenResponse, UserResponse } from "../dto/auth";
import type { ConversationResponse } from "../dto/conversations";
import type { Campaign, Organization, Project, Subproject } from "../dto/scopes";
import type { ApiKey, ApiKeyCreated, IamGroup, RoleAssignment, UserSummary } from "../dto/iam";
import { ScopeRolesSchema, type ScopeRoles } from "../dto/permissions";

export const login = (email: string, password: string): Promise<TokenResponse> =>
  api.post("auth/login", { json: { email, password } }).json();

export const register = (email: string, password: string): Promise<TokenResponse> =>
  api.post("auth/register", { json: { email, password } }).json();

export const getConversations = (params?: {
  organization_id?: string;
  scope_id?: string;
  scope_type?: string;
}): Promise<ConversationResponse[]> => {
  const searchParams = params
    ? (Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)) as Record<
        string,
        string
      >)
    : undefined;
  return api.get("conversations/", { headers: authHeaders(), searchParams }).json();
};

export type FilterField =
  | "title"
  | "content"
  | "meta"
  | "stats.word_count"
  | "stats.duration_seconds";
export type FilterOp = "eq" | "contains" | "regex" | "gt" | "gte" | "lt" | "lte";

export interface ConvFilter {
  field: FilterField;
  op: FilterOp;
  value: string;
  meta_key?: string;
}

export interface PagedConversations {
  items: ConversationResponse[];
  total: number;
  page: number;
  page_size: number;
}

export const searchConversations = (
  params: { organization_id?: string; scope_id?: string; scope_type?: string },
  body: {
    filters: ConvFilter[];
    tag_ids?: string[];
    page: number;
    page_size: number;
    sort_by: string;
    sort_dir: number;
  }
): Promise<PagedConversations> => {
  const searchParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null)
  ) as Record<string, string>;
  return api
    .post("conversations/search", { json: body, headers: authHeaders(), searchParams })
    .json();
};

export const createConversation = (data: {
  title: string;
  content:
    | string
    | Array<{
        speaker: string;
        text: string;
        words?: Array<{ word: string; start: number; end: number }>;
      }>;
  type?: "review" | "conversation";
  conversation_timestamp?: string;
  metadata?: { key: string; value: string }[];
  organization_id?: string;
  scope_id: string;
  scope_type?: "campaign";
  tag_ids?: string[];
}): Promise<ConversationResponse> =>
  api.post("conversations/", { json: data, headers: authHeaders() }).json();

export const updateConversation = (
  id: string,
  data: { title?: string; content?: string | unknown[]; tag_ids?: string[] }
): Promise<ConversationResponse> =>
  api.patch(`conversations/${id}`, { json: data, headers: authHeaders() }).json();

export const getConversation = (id: string): Promise<ConversationResponse> =>
  api.get(`conversations/${id}`, { headers: authHeaders() }).json();

export const deleteConversation = (id: string): Promise<void> =>
  api.delete(`conversations/${id}`, { headers: authHeaders() }).json();

export const getMe = (): Promise<UserResponse> =>
  api.get("auth/me", { headers: authHeaders() }).json();

export const updatePreferences = (locale: string): Promise<UserResponse> =>
  api.patch("auth/me/preferences", { json: { locale }, headers: authHeaders() }).json();

// --- Tags ---

export interface TagResponse {
  id: string;
  name: string;
  org_id: string;
  created_at: string;
}

export const listTags = (orgId: string): Promise<TagResponse[]> =>
  api.get(`conversations/organizations/${orgId}/tags`, { headers: authHeaders() }).json();

export const createTag = (orgId: string, name: string): Promise<TagResponse> =>
  api
    .post(`conversations/organizations/${orgId}/tags`, { json: { name }, headers: authHeaders() })
    .json();

export const deleteTag = (orgId: string, tagId: string): Promise<void> =>
  api
    .delete(`conversations/organizations/${orgId}/tags/${tagId}`, { headers: authHeaders() })
    .then(() => undefined);

// --- Scopes ---

export const getOrganizations = (): Promise<Organization[]> =>
  api.get("scopes/organizations/", { headers: authHeaders() }).json();

export const getOrganization = (orgId: string): Promise<Organization> =>
  api.get(`scopes/organizations/${orgId}`, { headers: authHeaders() }).json();

export const createOrganization = (name: string): Promise<Organization> =>
  api.post("scopes/organizations/", { json: { name }, headers: authHeaders() }).json();

export const getProjects = (orgId: string): Promise<Project[]> =>
  api.get(`scopes/organizations/${orgId}/projects/`, { headers: authHeaders() }).json();

export const getProject = (projectId: string): Promise<Project> =>
  api.get(`scopes/projects/${projectId}`, { headers: authHeaders() }).json();

export const createProject = (orgId: string, name: string): Promise<Project> =>
  api
    .post(`scopes/organizations/${orgId}/projects/`, { json: { name }, headers: authHeaders() })
    .json();

export const getSubprojects = (projectId: string): Promise<Subproject[]> =>
  api.get(`scopes/projects/${projectId}/subprojects/`, { headers: authHeaders() }).json();

export const getSubproject = (subprojectId: string): Promise<Subproject> =>
  api.get(`scopes/subprojects/${subprojectId}`, { headers: authHeaders() }).json();

export const createSubproject = (projectId: string, name: string): Promise<Subproject> =>
  api
    .post(`scopes/projects/${projectId}/subprojects/`, { json: { name }, headers: authHeaders() })
    .json();

export const getCampaign = (campaignId: string): Promise<Campaign> =>
  api.get(`scopes/campaigns/${campaignId}`, { headers: authHeaders() }).json();

export const renameProject = (projectId: string, name: string): Promise<Project> =>
  api.patch(`scopes/projects/${projectId}`, { json: { name }, headers: authHeaders() }).json();

export const renameSubproject = (subprojectId: string, name: string): Promise<Subproject> =>
  api
    .patch(`scopes/subprojects/${subprojectId}`, { json: { name }, headers: authHeaders() })
    .json();

export const renameCampaign = (campaignId: string, name: string): Promise<Campaign> =>
  api.patch(`scopes/campaigns/${campaignId}`, { json: { name }, headers: authHeaders() }).json();

export const updateProjectSettings = (
  projectId: string,
  body: { color: string | null }
): Promise<Project> =>
  api.patch(`scopes/projects/${projectId}/settings`, { json: body, headers: authHeaders() }).json();

export const updateSubprojectSettings = (
  subprojectId: string,
  body: { color: string | null }
): Promise<Subproject> =>
  api
    .patch(`scopes/subprojects/${subprojectId}/settings`, { json: body, headers: authHeaders() })
    .json();

export const updateCampaignSettings = (
  campaignId: string,
  body: { color: string | null }
): Promise<Campaign> =>
  api
    .patch(`scopes/campaigns/${campaignId}/settings`, { json: body, headers: authHeaders() })
    .json();

export const getCampaignsByOrg = (orgId: string): Promise<Campaign[]> =>
  api.get(`scopes/organizations/${orgId}/campaigns/`, { headers: authHeaders() }).json();

export const createCampaignUnderOrg = (orgId: string, name: string): Promise<Campaign> =>
  api
    .post(`scopes/organizations/${orgId}/campaigns/`, { json: { name }, headers: authHeaders() })
    .json();

export const getCampaignsByProject = (projectId: string): Promise<Campaign[]> =>
  api.get(`scopes/projects/${projectId}/campaigns/`, { headers: authHeaders() }).json();

export const createCampaignUnderProject = (projectId: string, name: string): Promise<Campaign> =>
  api
    .post(`scopes/projects/${projectId}/campaigns/`, { json: { name }, headers: authHeaders() })
    .json();

export const getCampaigns = (subprojectId: string): Promise<Campaign[]> =>
  api.get(`scopes/subprojects/${subprojectId}/campaigns/`, { headers: authHeaders() }).json();

export const createCampaign = (subprojectId: string, name: string): Promise<Campaign> =>
  api
    .post(`scopes/subprojects/${subprojectId}/campaigns/`, {
      json: { name },
      headers: authHeaders(),
    })
    .json();

// --- IAM ---

export const listUsers = (): Promise<UserSummary[]> =>
  api.get("iam/users", { headers: authHeaders() }).json();

export const listRoles = (
  orgId: string,
  opts?: { scope_type?: string; scope_id?: string }
): Promise<RoleAssignment[]> => {
  const searchParams = opts
    ? (Object.fromEntries(Object.entries(opts).filter(([, v]) => v != null)) as Record<
        string,
        string
      >)
    : undefined;
  return api
    .get(`iam/organizations/${orgId}/roles`, { headers: authHeaders(), searchParams })
    .json();
};

export const assignRole = (
  orgId: string,
  body: { subject: string; role: string; scope_type: string; scope_id: string }
): Promise<void> =>
  api
    .post(`iam/organizations/${orgId}/roles/assign`, { json: body, headers: authHeaders() })
    .then(() => undefined);

export const revokeRole = (
  orgId: string,
  body: { subject: string; role: string; scope_type: string; scope_id: string }
): Promise<void> =>
  api
    .post(`iam/organizations/${orgId}/roles/revoke`, { json: body, headers: authHeaders() })
    .then(() => undefined);

export const listGroups = (orgId: string): Promise<IamGroup[]> =>
  api.get(`iam/organizations/${orgId}/groups`, { headers: authHeaders() }).json();

export const createGroup = (
  orgId: string,
  name: string,
  scopeType?: string,
  scopeId?: string
): Promise<IamGroup> =>
  api
    .post(`iam/organizations/${orgId}/groups`, {
      json: { name, scope_type: scopeType ?? null, scope_id: scopeId ?? null },
      headers: authHeaders(),
    })
    .json();

export const deleteGroup = (orgId: string, groupId: string): Promise<void> =>
  api
    .delete(`iam/organizations/${orgId}/groups/${groupId}`, { headers: authHeaders() })
    .then(() => undefined);

export const addGroupMember = (orgId: string, groupId: string, userId: string): Promise<IamGroup> =>
  api
    .post(`iam/organizations/${orgId}/groups/${groupId}/members`, {
      json: { user_id: userId },
      headers: authHeaders(),
    })
    .json();

export const removeGroupMember = (
  orgId: string,
  groupId: string,
  memberId: string
): Promise<IamGroup> =>
  api
    .delete(`iam/organizations/${orgId}/groups/${groupId}/members/${memberId}`, {
      headers: authHeaders(),
    })
    .json();

export const listApiKeys = (): Promise<ApiKey[]> =>
  api.get("iam/api-keys", { headers: authHeaders() }).json();

export const createApiKey = (body: {
  name: string;
  scope_type?: string;
  scope_id?: string;
  role?: string;
}): Promise<ApiKeyCreated> =>
  api.post("iam/api-keys", { json: body, headers: authHeaders() }).json();

export const deleteApiKey = (keyId: string): Promise<void> =>
  api.delete(`iam/api-keys/${keyId}`, { headers: authHeaders() }).then(() => undefined);

export const getMyRoles = (orgId: string): Promise<ScopeRoles> =>
  api
    .get(`iam/organizations/${orgId}/my-roles`, { headers: authHeaders() })
    .json()
    .then((data) => ScopeRolesSchema.parse(data));

// --- Webhooks ---

import type { Delivery, WebhookEndpoint } from "../dto/webhooks";

export const listWebhookEndpoints = (orgId: string): Promise<WebhookEndpoint[]> =>
  api.get(`webhooks/organizations/${orgId}/endpoints`, { headers: authHeaders() }).json();

export const createWebhookEndpoint = (
  orgId: string,
  body: {
    url: string;
    secret?: string;
    event_types: string[];
    transformer: string;
    enabled: boolean;
    trigger_scope?: string | null;
    trigger_scope_id?: string | null;
  }
): Promise<WebhookEndpoint> =>
  api
    .post(`webhooks/organizations/${orgId}/endpoints`, { json: body, headers: authHeaders() })
    .json();

export const updateWebhookEndpoint = (
  orgId: string,
  epId: string,
  body: Partial<{
    url: string;
    secret: string;
    event_types: string[];
    transformer: string;
    enabled: boolean;
    trigger_scope: string | null;
    trigger_scope_id: string | null;
  }>
): Promise<WebhookEndpoint> =>
  api
    .patch(`webhooks/organizations/${orgId}/endpoints/${epId}`, {
      json: body,
      headers: authHeaders(),
    })
    .json();

export const deleteWebhookEndpoint = (orgId: string, epId: string): Promise<void> =>
  api
    .delete(`webhooks/organizations/${orgId}/endpoints/${epId}`, { headers: authHeaders() })
    .then(() => undefined);

export const listDeliveries = (orgId: string, epId: string): Promise<Delivery[]> =>
  api
    .get(`webhooks/organizations/${orgId}/endpoints/${epId}/deliveries`, { headers: authHeaders() })
    .json();

export const testTransformer = (
  transformer: string,
  payload: Record<string, unknown>
): Promise<{ result: Record<string, unknown> | null; error: string | null; stdout: string }> =>
  api
    .post("webhooks/transformer/test", { json: { transformer, payload }, headers: authHeaders() })
    .json();

// --- Imports ---

export const getImportJobs = (
  conversationId: string
): Promise<{ id: string; storage_key: string | null; status: string }[]> =>
  api.get(`imports/conversation/${conversationId}`, { headers: authHeaders() }).json();

export const uploadAudio = (
  conversationId: string,
  organizationId: string,
  scopeId: string,
  scopeType: string,
  file: File
): Promise<{ id: string; status: string; storage_key: string | null }> => {
  const form = new FormData();
  form.append("conversation_id", conversationId);
  form.append("organization_id", organizationId);
  form.append("scope_id", scopeId);
  form.append("scope_type", scopeType);
  form.append("file", file);
  return api.post("imports/", { body: form, headers: authHeaders() }).json();
};

// --- Billing ---

import type { SubscriptionResponse, UsageRecordResponse } from "../dto/billing";

export const getSubscription = (orgId: string): Promise<SubscriptionResponse> =>
  api.get(`billing/organizations/${orgId}/subscription`, { headers: authHeaders() }).json();

export const upgradeSubscription = (orgId: string, tier: string): Promise<SubscriptionResponse> =>
  api
    .post(`billing/organizations/${orgId}/subscription/upgrade`, {
      json: { tier },
      headers: authHeaders(),
    })
    .json();

export const getUsage = (orgId: string): Promise<UsageRecordResponse[]> =>
  api.get(`billing/organizations/${orgId}/usage`, { headers: authHeaders() }).json();
