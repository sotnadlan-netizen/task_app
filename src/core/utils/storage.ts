import { apiFetch } from '@/core/api/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionItem {
  id: string;
  sessionId?: string;
  title: string;
  description: string;
  assignee: "Advisor" | "Client";
  priority: "High" | "Medium" | "Low";
  completed: boolean;
  createdAt?: string;
}

export type SessionSentiment = "Positive" | "Neutral" | "At-Risk";

export interface NextMeetingSuggestion {
  title: string;
  date: string;   // YYYY-MM-DD or natural language from AI
  time: string;   // HH:MM or natural language
}

export interface Session {
  id: string;
  createdAt: string;
  filename: string;
  title?: string;
  summary: string;
  sentiment?: SessionSentiment;
  followUpQuestions?: string[];
  taskCount?: number;
  completedCount?: number;
  providerId?: string;
  clientEmail?: string;
  audioUrl?: string | null;
}

export interface ChatHistoryResponse {
  answer: string;
  citations: {
    sessionId: string;
    title: string;
    clientEmail: string | null;
    createdAt: string;
    similarity: number;
  }[];
  matchCount: number;
}

export interface PromptConfig {
  systemPrompt: string;
}

// ─── Default prompt (fallback if DB is unreachable or empty) ──────────────────

export const DEFAULT_SYSTEM_PROMPT = `אתה סוכן תיעוד בכיר עבור יועצים פיננסיים. מכיוון שהקלטת השיחה נמחקת לצמיתות מיד לאחר הניתוח, הסיכום שלך הוא התיעוד הרשמי היחיד.

משימותיך המורחבות:

1. **סיכום עומק (Summary)**: אל תסתפק בשורה אחת. תעד את כל המספרים, הריביות, שמות הבנקים ותאריכי היעד שהוזכרו בשיחה.

2. **זיהוי משימות (Action Items)**: חלץ כל התחייבות שנאמרה. חלק אותן ל"לקוח" ו"יועץ".

3. **דיוק פיננסי**: ודא שכל מונח (כמו "ריבית פריים", "תמהיל", "גרייס") נכתב בהקשר הנכון.

פורמט JSON בלבד:
{
  "summary": "סיכום מפורט הכולל נתונים מספריים והחלטות שהתקבלו",
  "tasks": [{ "title": "...", "description": "...", "assignee": "Advisor", "priority": "High" }]
}

ערכים חוקיים: assignee → "Advisor"|"Client", priority → "High"|"Medium"|"Low"
שפת הפלט: עברית מקצועית, עניינית ומדויקת.`;

// ─── Sessions API ─────────────────────────────────────────────────────────────

export interface SessionsPage {
  sessions: Session[];
  nextCursor: string | null;
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
}

export async function apiFetchSessions(): Promise<Session[]> {
  const res = await apiFetch("/api/sessions");
  await throwIfNotOk(res);
  return res.json();
}

export async function apiFetchSessionsPaginated(
  limit = 20,
  cursor?: string | null,
): Promise<SessionsPage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const res = await apiFetch(`/api/sessions?${params}`);
  await throwIfNotOk(res);
  return res.json();
}

export async function apiDeleteSession(id: string): Promise<void> {
  const res = await apiFetch(`/api/sessions/${id}`, { method: "DELETE" });
  await throwIfNotOk(res);
}

// ─── Tasks API ────────────────────────────────────────────────────────────────

export async function apiFetchTasksBySession(sessionId: string): Promise<ActionItem[]> {
  const res = await apiFetch(`/api/tasks?sessionId=${encodeURIComponent(sessionId)}`);
  await throwIfNotOk(res);
  return res.json();
}

export async function apiToggleTask(id: string): Promise<ActionItem> {
  const res = await apiFetch(`/api/tasks/${id}`, { method: "PATCH" });
  await throwIfNotOk(res);
  return res.json();
}

export async function apiCreateTask(task: {
  sessionId: string;
  title: string;
  description?: string;
  assignee: "Advisor" | "Client";
  priority: "High" | "Medium" | "Low";
}): Promise<ActionItem> {
  const res = await apiFetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId:   task.sessionId,
      title:       task.title,
      description: task.description ?? "",
      assignee:    task.assignee,
      priority:    task.priority,
    }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function apiUpdateTaskDetails(
  id: string,
  patch: { title?: string; description?: string; priority?: "High" | "Medium" | "Low" },
): Promise<ActionItem> {
  const res = await apiFetch(`/api/tasks/${id}/details`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function apiDeleteTask(id: string): Promise<void> {
  const res = await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
  await throwIfNotOk(res);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalSessions: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  sessionsByMonth: { month: string; count: number }[];
}

export async function apiFetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  const res = await apiFetch("/api/analytics/overview");
  await throwIfNotOk(res);
  return res.json();
}

// ─── Process Audio — STAYS on Render backend (Gemini AI pipeline) ─────────────

export async function apiProcessAudio(
  audioFile: File | Blob,
  systemPrompt: string,
  filename?: string,
  clientEmail?: string,
): Promise<{ session: Session; tasks: ActionItem[]; nextMeetingSuggestion: NextMeetingSuggestion | null }> {
  const formData = new FormData();
  const file =
    audioFile instanceof File
      ? audioFile
      : new File([audioFile], filename || "recording.webm", { type: "audio/webm" });
  formData.append("audio", file);
  formData.append("systemPrompt", systemPrompt);
  if (clientEmail) formData.append("clientEmail", clientEmail);

  const res = await apiFetch("/api/process-audio", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    const e = new Error(err.error || "Processing failed");
    (e as Error & { code?: string }).code = err.code;
    throw e;
  }
  return res.json();
}

// ─── Config API ───────────────────────────────────────────────────────────────

export async function apiFetchConfig(): Promise<PromptConfig> {
  const res = await apiFetch("/api/config");
  if (!res.ok) return { systemPrompt: DEFAULT_SYSTEM_PROMPT };
  return res.json();
}

export async function apiSaveConfig(config: PromptConfig): Promise<PromptConfig> {
  const res = await apiFetch("/api/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt: config.systemPrompt }),
  });
  await throwIfNotOk(res);
  return config;
}

// ─── Custom Prompt API ────────────────────────────────────────────────────────

export async function apiFetchCustomPrompt(): Promise<string> {
  const res = await apiFetch("/api/config/custom-prompt");
  if (!res.ok) return "";
  const data = await res.json();
  return data.customPrompt ?? "";
}

export async function apiSaveCustomPrompt(customPrompt: string): Promise<void> {
  const res = await apiFetch("/api/config/custom-prompt", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customPrompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save custom prompt");
  }
}

// ─── RAG Chat History API ──────────────────────────────────────────────────────

export async function apiChatHistory(
  query: string,
  clientEmail?: string,
  matchCount = 5,
): Promise<ChatHistoryResponse> {
  const res = await apiFetch("/api/chat-history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, clientEmail: clientEmail || "", matchCount }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Chat history request failed");
  }
  return res.json();
}

// ─── Google Calendar API ───────────────────────────────────────────────────────

export interface CalendarEventPayload {
  title: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM (24h)
  clientEmail?: string;
  durationMinutes?: number;
}

/**
 * Insert a Google Calendar event directly from the frontend using the
 * provider_token obtained from Supabase's OAuth session.
 *
 * NOTE: provider_token is short-lived (~1h). On 401, the user must re-login
 * with Google to obtain a fresh token.
 */
export async function apiAddCalendarEvent(
  providerToken: string,
  event: CalendarEventPayload,
): Promise<{ htmlLink: string }> {
  const startDateTime = `${event.date}T${event.time || "10:00"}:00`;
  const duration      = event.durationMinutes ?? 60;

  // Compute end time
  const start = new Date(startDateTime);
  const end   = new Date(start.getTime() + duration * 60_000);
  const endDateTime = end.toISOString().slice(0, 19); // trim milliseconds and Z

  const body = {
    summary:     event.title,
    description: event.clientEmail ? `פגישת מעקב עם לקוח: ${event.clientEmail}` : "פגישת מעקב",
    start: { dateTime: `${startDateTime}`, timeZone: "Asia/Jerusalem" },
    end:   { dateTime: `${endDateTime}`,   timeZone: "Asia/Jerusalem" },
    ...(event.clientEmail ? {
      attendees: [{ email: event.clientEmail }],
    } : {}),
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("CALENDAR_TOKEN_EXPIRED");
    throw new Error(err?.error?.message || `Google Calendar API error (${res.status})`);
  }

  const data = await res.json();
  return { htmlLink: data.htmlLink };
}

// ─── All tasks for a given client email (across all their sessions) ──────────

export async function apiFetchTasksByClient(clientEmail: string): Promise<ActionItem[]> {
  const res = await apiFetch(`/api/tasks/by-client?email=${encodeURIComponent(clientEmail)}`);
  await throwIfNotOk(res);
  return res.json();
}

// ─── Assign an unassigned session to a client email ──────────────────────────

export async function apiAssignSession(sessionId: string, clientEmail: string): Promise<void> {
  const res = await apiFetch(`/api/sessions/${sessionId}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientEmail }),
  });
  await throwIfNotOk(res);
}
