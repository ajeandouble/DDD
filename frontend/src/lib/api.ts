import { api, authHeaders } from "./http";
import type { TokenResponse, UserResponse } from "../dto/auth";
import type { ConversationResponse } from "../dto/conversations";
import type { Campaign, Organization, Project, Subproject } from "../dto/scopes";

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
    ? (Object.fromEntries(
        Object.entries(params).filter(([, v]) => v != null)
      ) as Record<string, string>)
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
