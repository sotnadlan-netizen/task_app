import { createClient } from "@supabase/supabase-js";

// ── Supabase client (lazy) ────────────────────────────────────────────────────
// Deferred so that process.env is fully populated before createClient runs.
// Crashes at first DB call with a clear message instead of at module load time.
let _supabase = null;

function getClient() {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  // ── Debug: confirm env visibility without leaking values ──────────────────
  console.log(`[db] SUPABASE_URL present:              ${!!url}`);
  console.log(`[db] SUPABASE_SERVICE_ROLE_KEY present: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
  console.log(`[db] SUPABASE_ANON_KEY present:         ${!!process.env.SUPABASE_ANON_KEY}`);

  if (!url) {
    throw new Error("[db] Missing SUPABASE_URL in Environment Variables");
  }
  if (!key) {
    throw new Error(
      "[db] Missing SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_ANON_KEY) in Environment Variables"
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[db] ⚠ SUPABASE_SERVICE_ROLE_KEY not set — using anon key.");
    console.warn("    Get it: Supabase → Settings → API → service_role (secret)");
  } else {
    console.log("[db] ✔ Using service_role key");
  }

  _supabase = createClient(url, key);
  return _supabase;
}

// ── Default system prompt ────────────────────────────────────────────────────
const DEFAULT_PROMPT =
  'אתה סוכן תיעוד בכיר עבור יועצים פיננסיים. מכיוון שהקלטת השיחה נמחקת לצמיתות מיד לאחר הניתוח, הסיכום שלך הוא התיעוד הרשמי היחיד.\n\n' +
  'משימותיך המורחבות:\n\n' +
  '1. **סיכום עומק (Summary)**: אל תסתפק בשורה אחת. תעד את כל המספרים, הריביות, שמות הבנקים ותאריכי היעד שהוזכרו בשיחה.\n\n' +
  '2. **זיהוי משימות (Action Items)**: חלץ כל התחייבות שנאמרה. חלק אותן ל"לקוח" ו"יועץ".\n\n' +
  '3. **דיוק פיננסי**: ודא שכל מונח (כמו "ריבית פריים", "תמהיל", "גרייס") נכתב בהקשר הנכון.\n\n' +
  'פורמט JSON בלבד:\n' +
  '{\n  "summary": "סיכום מפורט הכולל נתונים מספריים והחלטות שהתקבלו",\n  "tasks": [{ "title": "...", "description": "...", "assignee": "Advisor", "priority": "High" }]\n}\n\n' +
  'ערכים חוקיים: assignee → "Advisor"|"Client", priority → "High"|"Medium"|"Low"\n' +
  'שפת הפלט: עברית מקצועית, עניינית ומדויקת.';

// ── Row mappers (snake_case DB → camelCase app) ───────────────────────────────

function rowToSession(row) {
  return {
    id:          row.id,
    createdAt:   row.created_at,
    filename:    row.filename,
    summary:     row.summary  || "",
    providerId:  row.provider_id  || null,
    clientEmail: row.client_email || null,
  };
}

function rowToTask(row) {
  return {
    id:          row.id,
    sessionId:   row.session_id,
    createdAt:   row.created_at,
    title:       row.title,
    description: row.description || "",
    assignee:    row.assignee,
    priority:    row.priority,
    completed:   row.completed,
  };
}

// ── DatabaseService ───────────────────────────────────────────────────────────

class DatabaseService {

  // ── Sessions ───────────────────────────────────────────────────────────────

  async getAllSessions() {
    const { data, error } = await getClient()
      .from("sessions")
      .select("id, created_at, filename, summary, provider_id, client_email, tasks(id, completed)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`[db] getAllSessions: ${error.message}`);

    return (data || []).map((s) => ({
      ...rowToSession(s),
      taskCount:      (s.tasks || []).length,
      completedCount: (s.tasks || []).filter((t) => t.completed).length,
    }));
  }

  async getSessionsByProvider(providerId) {
    const { data, error } = await getClient()
      .from("sessions")
      .select("id, created_at, filename, summary, provider_id, client_email, tasks(id, completed)")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`[db] getSessionsByProvider: ${error.message}`);

    return (data || []).map((s) => ({
      ...rowToSession(s),
      taskCount:      (s.tasks || []).length,
      completedCount: (s.tasks || []).filter((t) => t.completed).length,
    }));
  }

  async getSessionsByClientEmail(email) {
    const { data, error } = await getClient()
      .from("sessions")
      .select("id, created_at, filename, summary, provider_id, client_email, tasks(id, completed)")
      .eq("client_email", email)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`[db] getSessionsByClientEmail: ${error.message}`);

    return (data || []).map((s) => ({
      ...rowToSession(s),
      taskCount:      (s.tasks || []).length,
      completedCount: (s.tasks || []).filter((t) => t.completed).length,
    }));
  }

  async getSessionById(id) {
    const { data, error } = await getClient()
      .from("sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return rowToSession(data);
  }

  async saveSession(session) {
    const payload = {
      id:           session.id,
      created_at:   session.createdAt,
      filename:     session.filename,
      summary:      session.summary  || "",
      provider_id:  session.providerId  || null,
      client_email: session.clientEmail || null,
    };

    console.log("[db] Attempting to save session with data:", JSON.stringify(payload, null, 2));

    const { error } = await getClient().from("sessions").insert(payload);

    if (error) {
      console.error("[db] saveSession FAILED — full error:", JSON.stringify(error, null, 2));
      throw new Error(`[db] saveSession: ${error.message} (code: ${error.code}, details: ${error.details})`);
    }

    console.log("[db] Session saved successfully:", session.id);
    return session;
  }

  async replaceSessions(sessions) {
    // CASCADE on tasks FK means deleting sessions also deletes their tasks.
    const { error: delErr } = await getClient()
      .from("sessions")
      .delete()
      .not("id", "is", null);

    if (delErr) throw new Error(`[db] replaceSessions (delete): ${delErr.message}`);
    if (!sessions.length) return;

    const { error: insErr } = await getClient().from("sessions").insert(
      sessions.map((s) => ({
        id:           s.id,
        created_at:   s.createdAt,
        filename:     s.filename,
        summary:      s.summary  || "",
        provider_id:  s.providerId  || null,
        client_email: s.clientEmail || null,
      }))
    );

    if (insErr) throw new Error(`[db] replaceSessions (insert): ${insErr.message}`);
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  async getAllTasks() {
    const { data, error } = await getClient()
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`[db] getAllTasks: ${error.message}`);
    return (data || []).map(rowToTask);
  }

  async getTaskById(id) {
    const { data, error } = await getClient()
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return rowToTask(data);
  }

  async getTasksBySessionId(sessionId) {
    const { data, error } = await getClient()
      .from("tasks")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`[db] getTasksBySessionId: ${error.message}`);
    return (data || []).map(rowToTask);
  }

  async saveTasks(tasks) {
    if (!tasks.length) return tasks;

    const { error } = await getClient().from("tasks").insert(
      tasks.map((t) => ({
        id:          t.id,
        session_id:  t.sessionId,
        created_at:  t.createdAt,
        title:       t.title,
        description: t.description || "",
        assignee:    t.assignee,
        priority:    t.priority,
        completed:   t.completed,
      }))
    );

    if (error) {
      console.error("[db] saveTasks FAILED — full error:", JSON.stringify(error, null, 2));
      throw new Error(`[db] saveTasks: ${error.message} (code: ${error.code}, details: ${error.details})`);
    }
    return tasks;
  }

  async replaceTasks(tasks) {
    const { error: delErr } = await getClient()
      .from("tasks")
      .delete()
      .not("id", "is", null);

    if (delErr) throw new Error(`[db] replaceTasks (delete): ${delErr.message}`);
    if (!tasks.length) return;
    await this.saveTasks(tasks);
  }

  async updateTaskStatus(id, completed) {
    const { data, error } = await getClient()
      .from("tasks")
      .update({ completed })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`[db] updateTaskStatus: ${error.message}`);
    return data ? rowToTask(data) : null;
  }

  async deleteTask(id) {
    const { error } = await getClient().from("tasks").delete().eq("id", id);
    if (error) throw new Error(`[db] deleteTask: ${error.message}`);
    return { ok: true };
  }

  // ── Profiles ───────────────────────────────────────────────────────────────

  async createProfile({ id, email, role }) {
    const { error } = await getClient()
      .from("profiles")
      .upsert({ id, email, role });

    if (error) throw new Error(`[db] createProfile: ${error.message}`);
    return { ok: true };
  }

  // ── Prompt Config ──────────────────────────────────────────────────────────

  async getPromptConfig() {
    const { data, error } = await getClient()
      .from("prompt_config")
      .select("system_prompt")
      .eq("id", 1)
      .single();

    if (error || !data) {
      await getClient()
        .from("prompt_config")
        .upsert({ id: 1, system_prompt: DEFAULT_PROMPT });
      return { systemPrompt: DEFAULT_PROMPT };
    }

    return { systemPrompt: data.system_prompt };
  }

  async savePromptConfig({ systemPrompt }) {
    const { error } = await getClient()
      .from("prompt_config")
      .upsert({ id: 1, system_prompt: systemPrompt });

    if (error) throw new Error(`[db] savePromptConfig: ${error.message}`);
    return { systemPrompt };
  }

  // ── Health check ───────────────────────────────────────────────────────────

  async ping() {
    const { error } = await getClient().from("sessions").select("id").limit(1);
    if (error) throw new Error(`Supabase ping failed: ${error.message}`);
    return true;
  }
}

export const db = new DatabaseService();
