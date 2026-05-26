const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (
    !(fetchOptions.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: response.statusText,
    }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  processAudio: (formData: FormData, token: string) =>
    request("/api/audio/process", {
      method: "POST",
      body: formData,
      token,
    }),

  getTasks: (orgId: string, token: string) =>
    request(`/api/tasks?org_id=${orgId}`, { token }),

  updateTask: (
    taskId: string,
    data: Record<string, unknown>,
    token: string
  ) =>
    request(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    }),

  createEditRequest: (
    data: {
      task_id: string;
      field_changed: string;
      old_value: string;
      new_value: string;
    },
    token: string
  ) =>
    request("/api/tasks/edit-request", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  reviewEditRequest: (
    pendingTaskId: string,
    action: "approved" | "rejected",
    token: string
  ) =>
    request(`/api/tasks/edit-request/${pendingTaskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: action }),
      token,
    }),

  getPromptVersions: (orgId: string, token: string) =>
    request(`/api/prompts?org_id=${orgId}`, { token }),

  createPromptVersion: (
    data: { org_id: string; prompt_text: string },
    token: string
  ) =>
    request("/api/prompts", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  getOrganizations: (token: string) =>
    request("/api/organizations", { token }),

  getOrgMembers: (orgId: string, token: string) =>
    request(`/api/organizations/${orgId}/members`, { token }),

  updateMemberQuota: (
    membershipId: string,
    capacityMinutes: number,
    token: string
  ) =>
    request(`/api/organizations/members/${membershipId}/quota`, {
      method: "PATCH",
      body: JSON.stringify({ capacity_minutes: capacityMinutes }),
      token,
    }),

  getCapacity: (orgId: string, token: string) =>
    request<{ capacity_minutes: number; used_minutes: number }>(
      `/api/organizations/${orgId}/capacity`,
      { token }
    ),

  createTask: (
    data: {
      org_id: string;
      title: string;
      description?: string;
      priority?: string;
      status?: string;
      session_id?: string;
    },
    token: string
  ) =>
    request("/api/tasks", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  deleteTask: (taskId: string, token: string) =>
    request(`/api/tasks/${taskId}`, {
      method: "DELETE",
      token,
    }),

  deleteSession: (sessionId: string, token: string) =>
    request(`/api/sessions/${sessionId}`, {
      method: "DELETE",
      token,
    }),

  createOrg: (data: { name: string; total_capacity_min: number; max_members: number }, token: string) =>
    request("/api/organizations", { method: "POST", body: JSON.stringify(data), token }),

  updateOrg: (orgId: string, data: { name?: string; total_capacity_min?: number; max_members?: number }, token: string) =>
    request(`/api/organizations/${orgId}`, { method: "PATCH", body: JSON.stringify(data), token }),

  deleteOrg: (orgId: string, token: string) =>
    request(`/api/organizations/${orgId}`, { method: "DELETE", token }),

  addOrgMember: (orgId: string, data: { email: string; role: string }, token: string) =>
    request(`/api/organizations/${orgId}/members`, { method: "POST", body: JSON.stringify(data), token }),

  removeOrgMember: (orgId: string, membershipId: string, token: string) =>
    request(`/api/organizations/${orgId}/members/${membershipId}`, { method: "DELETE", token }),

  updateMemberRole: (orgId: string, membershipId: string, role: string, token: string) =>
    request(`/api/organizations/${orgId}/members/${membershipId}/role`, { method: "PATCH", body: JSON.stringify({ role }), token }),

  // ── System Prompts (platform admin) ──────────────────────────────────────
  listSystemPrompts: (token: string) =>
    request("/api/system-prompts", { token }),

  createSystemPrompt: (
    data: { name: string; description: string; system_text: string },
    token: string
  ) =>
    request("/api/system-prompts", { method: "POST", body: JSON.stringify(data), token }),

  updateSystemPrompt: (
    promptId: string,
    data: { name?: string; description?: string; system_text?: string },
    token: string
  ) =>
    request(`/api/system-prompts/${promptId}`, { method: "PATCH", body: JSON.stringify(data), token }),

  deleteSystemPrompt: (promptId: string, token: string) =>
    request(`/api/system-prompts/${promptId}`, { method: "DELETE", token }),

  // ── Org Prompt Selection (org admin) ─────────────────────────────────────
  selectOrgPrompt: (orgId: string, promptId: string | null, token: string) =>
    request(`/api/organizations/${orgId}/prompt`, {
      method: "PATCH",
      body: JSON.stringify({ prompt_id: promptId }),
      token,
    }),

  // ── Org Prompt Availability ──────────────────────────────────────────────
  // Prompts an org may choose from (headline + description only, no system_text).
  listAvailablePrompts: (orgId: string, token: string) =>
    request(`/api/organizations/${orgId}/available-prompts`, { token }),

  // Platform-admin: which prompt ids are assigned to an org / replace the set.
  getOrgAssignedPrompts: (orgId: string, token: string) =>
    request<string[]>(`/api/organizations/${orgId}/assigned-prompts`, { token }),

  setOrgAssignedPrompts: (orgId: string, promptIds: string[], token: string) =>
    request(`/api/organizations/${orgId}/assigned-prompts`, {
      method: "PUT",
      body: JSON.stringify({ prompt_ids: promptIds }),
      token,
    }),

  getProjects: (orgId: string, token: string) =>
    request<{ id: string; org_id: string; name: string; created_at: string }[]>(
      `/api/projects?org_id=${orgId}`, { token }
    ),

  createProject: (data: { org_id: string; name: string }, token: string) =>
    request<{ id: string; org_id: string; name: string; created_at: string }>(
      "/api/projects", { method: "POST", body: JSON.stringify(data), token }
    ),

  updateSession: (sessionId: string, data: { project_id?: string; participant_ids?: string[]; summary?: string }, token: string) =>
    request(`/api/sessions/${sessionId}`, { method: "PATCH", body: JSON.stringify(data), token }),

  // ── Profile (per-user UI language) ───────────────────────────────────────
  updateProfileLanguage: (language: "en" | "he", token: string) =>
    request("/api/profile", { method: "PATCH", body: JSON.stringify({ language }), token }),

  // ── Helpdesk tickets ──────────────────────────────────────────────────────
  getTickets: (orgId: string, token: string) =>
    request(`/api/tickets?org_id=${orgId}`, { token }),

  // Global cross-org list — platform admins only.
  getAllTickets: (token: string) => request("/api/tickets/all", { token }),

  getTicketMessages: (ticketId: string, token: string) =>
    request(`/api/tickets/${ticketId}/messages`, { token }),

  postTicketMessage: (ticketId: string, body: string, token: string) =>
    request(`/api/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
      token,
    }),

  createTicket: (
    data: {
      org_id: string;
      title: string;
      description?: string;
      type?: "manual_complaint" | "system_error";
      priority?: "low" | "medium" | "high" | "critical";
      metadata?: Record<string, unknown>;
    },
    token: string
  ) =>
    request("/api/tickets", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  updateTicket: (
    ticketId: string,
    data: { status?: string; priority?: string; title?: string; description?: string },
    token: string
  ) =>
    request(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    }),
};
