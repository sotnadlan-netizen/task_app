"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, Check, RotateCcw, Clock, Zap, ListChecks, Brain, FolderOpen } from "lucide-react";
import { BentoCard, type BentoCardData, type BentoCardType } from "./bento-card";
import type { Session, Task, TaskPriority } from "@/types";
import { useSupabase } from "@/providers/supabase-provider";
import { api } from "@/lib/api";

interface Props {
  session: Session;
  tasks: Task[];
}

const SENTIMENT_HE: Record<string, string> = {
  positive: "חיובי",
  negative: "שלילי",
  neutral:  "נייטרלי",
  mixed:    "מעורב",
};

function translateSentiment(raw: string | null | undefined): string {
  if (!raw) return "נייטרלי";
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(SENTIMENT_HE)) {
    if (lower.includes(key)) return val;
  }
  return raw;
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function buildSummaryCard(session: Session): BentoCardData {
  return {
    id: `summary-${session.id}`,
    type: "summary" as BentoCardType,
    index: 1,
    title: session.title || "סיכום שיחה",
    content: session.summary || "לא נמצא סיכום.",
    sessionId: session.id,
  };
}

function taskToCard(task: Task, index: number): BentoCardData {
  return {
    id: task.id,
    type: "task" as BentoCardType,
    index,
    title: task.title,
    content: task.description || "אין הקשר נוסף.",
    priority: task.priority,
    status: task.status,
    taskDescription: task.description,
    sessionId: task.session_id,
  };
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
};

const inputCls =
  "w-full px-3 py-2 border border-[#dddbda] rounded text-sm text-[#080707] bg-white focus:outline-none focus:ring-2 focus:ring-[#0070d2]/40 focus:border-transparent resize-none";
const selectCls =
  "px-3 py-2 border border-[#dddbda] rounded text-sm text-[#080707] bg-white focus:outline-none focus:ring-2 focus:ring-[#0070d2]/40 focus:border-transparent";

export function BentoGrid({ session, tasks }: Props) {
  const { session: authSession } = useSupabase();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [addTitle,     setAddTitle]     = useState("");
  const [addDesc,      setAddDesc]      = useState("");
  const [addPriority,  setAddPriority]  = useState<TaskPriority>("medium");
  const [addSaving,    setAddSaving]    = useState(false);
  const [addError,     setAddError]     = useState<string | null>(null);

  const resetAddForm = () => {
    setAddTitle(""); setAddDesc(""); setAddPriority("medium"); setAddError(null); setIsAddingTask(false);
  };

  const handleAddTask = async () => {
    const token = authSession?.access_token;
    if (!token || !addTitle.trim()) return;
    setAddSaving(true);
    setAddError(null);
    try {
      const created = await api.createTask(
        { org_id: session.org_id, session_id: session.id, title: addTitle.trim(), description: addDesc.trim() || undefined, priority: addPriority, status: "todo" },
        token,
      ) as Task;
      setLocalTasks((prev) => [...prev, created]);
      resetAddForm();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "שגיאה בהוספה");
    } finally {
      setAddSaving(false);
    }
  };

  const summaryCard = buildSummaryCard(session);
  const taskCards   = localTasks.map((t, i) => taskToCard(t, i + 1));
  const doneCount   = localTasks.filter((t) => t.status === "done").length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 w-full"
      dir="rtl"
    >
      {/* ── Meta chips row ─────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex items-center gap-2.5 flex-wrap">
        {/* Duration */}
        {session.duration_seconds !== undefined && (
          <span className="inline-flex items-center gap-1.5 bg-[#ecf5fe] text-[#0070d2] rounded px-3 py-1 text-xs font-semibold border border-[#b3d9f6]">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(session.duration_seconds)}
          </span>
        )}

        {/* Sentiment */}
        {session.sentiment && (
          <span className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 rounded-full px-3 py-1 text-xs font-semibold border border-sky-100">
            <Zap className="w-3.5 h-3.5" />
            {translateSentiment(session.sentiment)}
          </span>
        )}

        {/* Task count */}
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 text-xs font-semibold border border-emerald-100">
          <ListChecks className="w-3.5 h-3.5" />
          {doneCount}/{localTasks.length} משימות הושלמו
        </span>

        {/* Session date */}
        <span className="text-xs text-gray-400 mr-1">
          {new Date(session.created_at).toLocaleDateString("he-IL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
      </motion.div>

      {/* ── Summary card (clickable → expands) ────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <BentoCard
          card={summaryCard}
          expandedId={expandedId}
          onExpand={setExpandedId}
          entryDelay={0}
        />
      </motion.div>

      {/* ── Tasks panel ────────────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="glass-panel bg-white rounded-lg border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] overflow-hidden"
      >
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-[#dddbda] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#ecf5fe] flex items-center justify-center flex-shrink-0">
              <Brain className="w-3.5 h-3.5 text-[#0070d2]" />
            </div>
            <h2 className="text-base font-bold text-[#080707]">משימות שזוהו</h2>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#ecf5fe] text-[#0070d2] border border-[#b3d9f6]">
            <FolderOpen className="w-3 h-3" />
            {localTasks.length}
          </span>
        </div>

        {/* Task rows */}
        {taskCards.length > 0 ? (
          <div>
            {taskCards.map((card, i) => (
              <div key={card.id} className={i < taskCards.length - 1 ? "border-b border-gray-50" : ""}>
                <BentoCard
                  card={card}
                  expandedId={expandedId}
                  onExpand={setExpandedId}
                  entryDelay={0.05 + i * 0.04}
                  onDelete={() => setLocalTasks((prev) => prev.filter((t) => t.id !== card.id))}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-400">לא זוהו משימות בפגישה זו.</p>
          </div>
        )}

        {/* Add task */}
        <div className="px-5 py-3 border-t border-gray-50">
          <AnimatePresence initial={false}>
            {isAddingTask ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
                dir="rtl"
              >
                <p className="text-xs font-semibold text-[#0070d2]">משימה חדשה</p>
                <input
                  className={inputCls}
                  placeholder="כותרת המשימה..."
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  dir="rtl"
                  autoFocus
                  onKeyDown={(e) => e.key === "Escape" && resetAddForm()}
                />
                <textarea
                  className={inputCls}
                  placeholder="תיאור (אופציונלי)..."
                  rows={2}
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  dir="rtl"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <select className={selectCls} value={addPriority} onChange={(e) => setAddPriority(e.target.value as TaskPriority)} dir="rtl">
                    <option value="low">נמוכה</option>
                    <option value="medium">בינונית</option>
                    <option value="high">גבוהה</option>
                    <option value="critical">קריטית</option>
                  </select>
                  {addError && <span className="text-xs text-red-500">{addError}</span>}
                </div>
                <div className="flex gap-2 pb-1">
                  <button onClick={handleAddTask} disabled={addSaving || !addTitle.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-white bg-[#0070d2] hover:bg-[#005fb2] disabled:opacity-50 transition-colors">
                    {addSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    הוסף
                  </button>
                  <button onClick={resetAddForm} disabled={addSaving} className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-gray-500 border border-[#dddbda] hover:bg-gray-50 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" />
                    ביטול
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="add-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddingTask(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded text-sm text-[#0070d2] hover:text-[#005fb2] hover:bg-[#ecf5fe] border border-dashed border-[#b3d9f6] hover:border-[#0070d2] transition-all"
                dir="rtl"
              >
                <Plus className="w-4 h-4" />
                הוסף משימה
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
