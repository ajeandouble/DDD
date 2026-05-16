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

export const createConversation = (data: {
  title: string;
  content: string;
  organization_id?: string;
  scope_id?: string;
  scope_type?: string;
  tag_ids?: string[];
}): Promise<ConversationResponse> =>
  api.post("conversations/", { json: data, headers: authHeaders() }).json();

export const updateConversation = (
  id: string,
  data: { title?: string; content?: string }
): Promise<ConversationResponse> =>
  api.patch(`conversations/${id}`, { json: data, headers: authHeaders() }).json();

export const deleteConversation = (id: string): Promise<void> =>
  api.delete(`conversations/${id}`, { headers: authHeaders() }).json();

export const getMe = (): Promise<UserResponse> =>
  api.get("auth/me", { headers: authHeaders() }).json();

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
  opts?: { scope_type?: string; scope_id?: string },
): Promise<RoleAssignment[]> => {
  const searchParams = opts
    ? (Object.fromEntries(
        Object.entries(opts).filter(([, v]) => v != null),
      ) as Record<string, string>)
    : undefined;
  return api
    .get(`iam/organizations/${orgId}/roles`, { headers: authHeaders(), searchParams })
    .json();
};

export const assignRole = (
  orgId: string,
  body: { subject: string; role: string; scope_type: string; scope_id: string },
): Promise<void> =>
  api
    .post(`iam/organizations/${orgId}/roles/assign`, { json: body, headers: authHeaders() })
    .then(() => undefined);

export const revokeRole = (
  orgId: string,
  body: { subject: string; role: string; scope_type: string; scope_id: string },
): Promise<void> =>
  api
    .post(`iam/organizations/${orgId}/roles/revoke`, { json: body, headers: authHeaders() })
    .then(() => undefined);

export const listGroups = (orgId: string): Promise<IamGroup[]> =>
  api.get(`iam/organizations/${orgId}/groups`, { headers: authHeaders() }).json();

export const createGroup = (orgId: string, name: string): Promise<IamGroup> =>
  api
    .post(`iam/organizations/${orgId}/groups`, { json: { name }, headers: authHeaders() })
    .json();

export const deleteGroup = (orgId: string, groupId: string): Promise<void> =>
  api
    .delete(`iam/organizations/${orgId}/groups/${groupId}`, { headers: authHeaders() })
    .then(() => undefined);

export const addGroupMember = (
  orgId: string,
  groupId: string,
  userId: string,
): Promise<IamGroup> =>
  api
    .post(`iam/organizations/${orgId}/groups/${groupId}/members`, {
      json: { user_id: userId },
      headers: authHeaders(),
    })
    .json();

export const removeGroupMember = (
  orgId: string,
  groupId: string,
  memberId: string,
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
