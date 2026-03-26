import { apiFetch } from "./apiClient";

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

export interface Session {
  id: string;
  createdAt: string;
  filename: string;
  summary: string;
  taskCount?: number;
  completedCount?: number;
  providerId?: string;
  clientEmail?: string;
  audioUrl?: string | null;
}

export interface PromptConfig {
  systemPrompt: string;
}

// ─── Default prompt (fallback if backend unreachable) ─────────────────────────

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

export async function apiFetchSessions(): Promise<Session[]> {
  const res = await apiFetch("/api/sessions");
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function apiFetchSessionsPaginated(
  limit = 20,
  cursor?: string | null,
): Promise<SessionsPage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const res = await apiFetch(`/api/sessions?${params}`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function apiLoadMockData(): Promise<{ sessions: number; tasks: number }> {
  const res = await apiFetch("/api/mock-data", { method: "POST" });
  if (!res.ok) throw new Error("Failed to load mock data");
  return res.json();
}

// ─── Tasks API ────────────────────────────────────────────────────────────────

export async function apiFetchTasksBySession(sessionId: string): Promise<ActionItem[]> {
  const res = await apiFetch(`/api/tasks?sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export async function apiToggleTask(id: string): Promise<ActionItem> {
  const res = await apiFetch(`/api/tasks/${id}`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to toggle task");
  return res.json();
}

// ─── Process Audio API ────────────────────────────────────────────────────────

export async function apiProcessAudio(
  audioFile: File | Blob,
  systemPrompt: string,
  filename?: string,
  clientEmail?: string,
): Promise<{ session: Session; tasks: ActionItem[] }> {
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
    console.error("[apiProcessAudio] HTTP", res.status, err);
    throw new Error(err.error || "Processing failed");
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
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to save config");
  return res.json();
}
