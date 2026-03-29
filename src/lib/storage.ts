import { apiFetch } from "./apiClient";
import { supabase } from "./supabaseClient";

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

// ─── Row mappers (DB snake_case → app camelCase) ──────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSession(row: any): Session {
  const tasks: { id: string; completed: boolean }[] = row.tasks ?? [];
  return {
    id:                row.id,
    createdAt:         row.created_at,
    filename:          row.filename ?? "",
    title:             row.title ?? "",
    summary:           row.summary ?? "",
    sentiment:         (row.sentiment ?? "Neutral") as SessionSentiment,
    followUpQuestions: row.follow_up_questions ?? [],
    providerId:        row.provider_id ?? null,
    clientEmail:       row.client_email ?? null,
    audioUrl:          row.audio_url ?? null,
    taskCount:         tasks.length,
    completedCount:    tasks.filter((t) => t.completed).length,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTask(row: any): ActionItem {
  return {
    id:          row.id,
    sessionId:   row.session_id,
    createdAt:   row.created_at,
    title:       row.title,
    description: row.description ?? "",
    assignee:    row.assignee,
    priority:    row.priority,
    completed:   row.completed,
  };
}

const SESSION_COLS = "*, tasks(id, completed)";

// ─── Auth context helper ──────────────────────────────────────────────────────
// Returns the current user's id, email, and resolved role.
// Used to add explicit .eq() tenant filters on top of RLS (defense-in-depth).
async function getCurrentUserContext(): Promise<{
  userId: string;
  userEmail: string;
  role: "provider" | "client";
} | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const u = session.user;
  const r = u.user_metadata?.role;
  const role: "provider" | "client" = r === "client" ? "client" : "provider";
  return { userId: u.id, userEmail: u.email ?? "", role };
}

// ─── Sessions API — direct Supabase (bypasses Render cold starts) ─────────────

export interface SessionsPage {
  sessions: Session[];
  nextCursor: string | null;
}

export async function apiFetchSessions(): Promise<Session[]> {
  const ctx = await getCurrentUserContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from("sessions").select(SESSION_COLS).order("created_at", { ascending: false });
  if (ctx?.role === "provider") {
    query = query.eq("provider_id", ctx.userId);
  } else if (ctx?.role === "client") {
    query = query.eq("client_email", ctx.userEmail);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToSession);
}

export async function apiFetchSessionsPaginated(
  limit = 20,
  cursor?: string | null,
): Promise<SessionsPage> {
  const ctx = await getCurrentUserContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("sessions")
    .select(SESSION_COLS)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (ctx?.role === "provider") {
    query = query.eq("provider_id", ctx.userId);
  } else if (ctx?.role === "client") {
    query = query.eq("client_email", ctx.userEmail);
  }
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    sessions:   page.map(rowToSession),
    nextCursor: hasMore ? page[page.length - 1].created_at : null,
  };
}

/** POST /api/mock-data — kept on backend (needs service_role for bulk seed) */
export async function apiLoadMockData(): Promise<{ sessions: number; tasks: number }> {
  const res = await apiFetch("/api/mock-data", { method: "POST" });
  if (!res.ok) throw new Error("Failed to load mock data");
  return res.json();
}

export async function apiDeleteSession(id: string): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Tasks API — direct Supabase ──────────────────────────────────────────────

export async function apiFetchTasksBySession(sessionId: string): Promise<ActionItem[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToTask);
}

export async function apiToggleTask(id: string): Promise<ActionItem> {
  // Read current state, then flip atomically
  const { data: cur, error: readErr } = await supabase
    .from("tasks")
    .select("completed")
    .eq("id", id)
    .single();
  if (readErr || !cur) throw new Error(readErr?.message ?? "Task not found");
  const { data, error } = await supabase
    .from("tasks")
    .update({ completed: !cur.completed })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Toggle failed");
  return rowToTask(data);
}

export async function apiCreateTask(task: {
  sessionId: string;
  title: string;
  description?: string;
  assignee: "Advisor" | "Client";
  priority: "High" | "Medium" | "Low";
}): Promise<ActionItem> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      session_id:  task.sessionId,
      title:       task.title,
      description: task.description ?? "",
      assignee:    task.assignee,
      priority:    task.priority,
      completed:   false,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Create task failed");
  return rowToTask(data);
}

export async function apiUpdateTaskDetails(
  id: string,
  patch: { title?: string; description?: string; priority?: "High" | "Medium" | "Low" },
): Promise<ActionItem> {
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined)       update.title       = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.priority !== undefined)    update.priority    = patch.priority;
  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Update task failed");
  return rowToTask(data);
}

export async function apiDeleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Analytics — direct Supabase (client-side aggregation) ───────────────────

export interface AnalyticsOverview {
  totalSessions: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  sessionsByMonth: { month: string; count: number }[];
}

export async function apiFetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  const ctx = await getCurrentUserContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sessQuery: any = supabase.from("sessions").select("id, created_at");
  if (ctx?.role === "provider") {
    sessQuery = sessQuery.eq("provider_id", ctx.userId);
  } else if (ctx?.role === "client") {
    sessQuery = sessQuery.eq("client_email", ctx.userEmail);
  }
  const { data: sessions, error: sessErr } = await sessQuery;
  if (sessErr) throw new Error(sessErr.message);

  const allSessions = sessions ?? [];
  if (allSessions.length === 0) {
    return { totalSessions: 0, totalTasks: 0, completedTasks: 0, completionRate: 0, sessionsByMonth: [] };
  }

  const sessionIds = allSessions.map((s) => s.id);
  const { data: tasks, error: taskErr } = await supabase
    .from("tasks")
    .select("id, completed, created_at")
    .in("session_id", sessionIds);
  if (taskErr) throw new Error(taskErr.message);

  const allTasks = tasks ?? [];
  const totalTasks    = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const byMonth: Record<string, number> = {};
  allSessions.forEach((s) => {
    const month = s.created_at.slice(0, 7);
    byMonth[month] = (byMonth[month] ?? 0) + 1;
  });
  const sessionsByMonth = Object.entries(byMonth)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { totalSessions: allSessions.length, totalTasks, completedTasks, completionRate, sessionsByMonth };
}

// ─── Process Audio — STAYS on Render backend (Gemini AI pipeline) ─────────────

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
    throw new Error(err.error || "Processing failed");
  }
  return res.json();
}

// ─── Config API — direct Supabase ────────────────────────────────────────────

export async function apiFetchConfig(): Promise<PromptConfig> {
  const { data, error } = await supabase
    .from("prompt_config")
    .select("system_prompt")
    .eq("id", 1)
    .single();
  if (error || !data) return { systemPrompt: DEFAULT_SYSTEM_PROMPT };
  return { systemPrompt: data.system_prompt };
}

export async function apiSaveConfig(config: PromptConfig): Promise<PromptConfig> {
  const { error } = await supabase
    .from("prompt_config")
    .upsert({ id: 1, system_prompt: config.systemPrompt });
  if (error) throw new Error(error.message);
  return config;
}
