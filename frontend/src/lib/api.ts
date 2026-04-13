const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
};
