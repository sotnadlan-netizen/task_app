"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TaskPriority, TaskStatus } from "@/types";
import {
  X, CheckCircle2, Clock, Zap, Brain, ArrowUpRight,
  Pencil, Check, RotateCcw, Loader2, Trash2, FolderOpen,
} from "lucide-react";
import { useSupabase } from "@/providers/supabase-provider";
import { useLanguage } from "@/providers/language-provider";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export type BentoCardType = "summary" | "sentiment" | "duration" | "task";

export interface BentoCardData {
  id: string;
  type: BentoCardType;
  index: number;
  title: string;
  content: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  taskDescription?: string;
  durationSeconds?: number;
  sessionId?: string;
  projectName?: string;
}

const priorityBadgeVariant: Record<TaskPriority, "default" | "info" | "warning" | "danger"> = {
  low: "default",
  medium: "info",
  high: "warning",
  critical: "danger",
};

function TypeIcon({ type, className = "w-4 h-4" }: { type: BentoCardType; className?: string }) {
  const base = `${className} flex-shrink-0`;
  if (type === "summary")   return <Brain className={base} style={{ color: "#0070d2" }} />;
  if (type === "sentiment") return <Zap className={base} style={{ color: "#1ab9ff" }} />;
  if (type === "duration")  return <Clock className={base} style={{ color: "#0070d2" }} />;
  return <CheckCircle2 className={base} style={{ color: "#0070d2" }} />;
}

function CardLabel({ type }: { type: BentoCardType }) {
  const { t } = useLanguage();
  const labels: Record<BentoCardType, string> = {
    summary: t("results.cardSummaryLabel"),
    sentiment: t("results.cardSentimentLabel"),
    duration: t("results.cardDurationLabel"),
    task: t("results.cardTaskLabel"),
  };
  return <span className="text-xs font-medium text-gray-400">{labels[type]}</span>;
}

const inputCls =
  "w-full px-3 py-2 border border-[#dddbda] rounded text-sm text-[#080707] bg-white focus:outline-none focus:ring-2 focus:ring-[#0070d2]/40 focus:border-transparent resize-none";
const selectCls =
  "px-3 py-2 border border-[#dddbda] rounded text-sm text-[#080707] bg-white focus:outline-none focus:ring-2 focus:ring-[#0070d2]/40 focus:border-transparent";

interface Props {
  card: BentoCardData;
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  entryDelay?: number;
  onDelete?: () => void;
}

export function BentoCard({ card, expandedId, onExpand, entryDelay = 0, onDelete }: Props) {
  const { session: authSession } = useSupabase();
  const { t } = useLanguage();
  const PRIORITY_LABELS: Record<TaskPriority, string> = {
    low: t("tasks.priorityLow"),
    medium: t("tasks.priorityMedium"),
    high: t("tasks.priorityHigh"),
    critical: t("tasks.priorityCritical"),
  };
  const STATUS_LABELS: Record<TaskStatus, string> = {
    todo: t("tasks.statusTodo"),
    in_progress: t("tasks.statusInProgress"),
    done: t("tasks.statusDone"),
  };
  const isExpanded = expandedId === card.id;
  const isBlurred = expandedId !== null && !isExpanded;

  const [displayTitle,    setDisplayTitle]    = useState(card.title);
  const [displayDesc,     setDisplayDesc]     = useState(card.taskDescription || card.content);
  const [displayPriority, setDisplayPriority] = useState<TaskPriority>(card.priority ?? "medium");
  const [displayStatus,   setDisplayStatus]   = useState<TaskStatus>(card.status ?? "todo");

  const [isEditing,    setIsEditing]    = useState(false);
  const [editTitle,    setEditTitle]    = useState(displayTitle);
  const [editDesc,     setEditDesc]     = useState(displayDesc);
  const [editPriority, setEditPriority] = useState<TaskPriority>(displayPriority);
  const [editStatus,   setEditStatus]   = useState<TaskStatus>(displayStatus);
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState<string | null>(null);

  const [toggling,      setToggling]      = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);

  const isDone = displayStatus === "done";

  const startEdit = () => {
    setEditTitle(displayTitle);
    setEditDesc(displayDesc);
    setEditPriority(displayPriority);
    setEditStatus(displayStatus);
    setSaveError(null);
    setIsEditing(true);
  };

  const cancelEdit = () => { setIsEditing(false); setSaveError(null); };

  const handleSave = async () => {
    const token = authSession?.access_token;
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (card.type === "task") {
        await api.updateTask(card.id, { title: editTitle.trim(), description: editDesc.trim(), priority: editPriority, status: editStatus }, token);
        setDisplayTitle(editTitle.trim());
        setDisplayDesc(editDesc.trim());
        setDisplayPriority(editPriority);
        setDisplayStatus(editStatus);
      } else if (card.type === "summary" && card.sessionId) {
        await api.updateSession(card.sessionId, { summary: editDesc.trim() }, token);
        setDisplayDesc(editDesc.trim());
      }
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("tasks.errSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const token = authSession?.access_token;
    if (!token || card.type !== "task" || toggling) return;
    const next: TaskStatus = isDone ? "todo" : "done";
    setToggling(true);
    try {
      await api.updateTask(card.id, { status: next }, token);
      setDisplayStatus(next);
    } catch {
      // revert visually on next render
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    const token = authSession?.access_token;
    if (!token) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteTask(card.id, token);
      onExpand(null);
      onDelete?.();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t("meetings.errDelete"));
    } finally {
      setDeleting(false);
    }
  };

  // ─── Summary compact ──────────────────────────────────────────────────────────
  if (card.type === "summary") {
    return (
      <>
        <motion.div
          layoutId={`card-${card.id}`}
          onClick={() => !isBlurred && onExpand(card.id)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: isBlurred ? 0.3 : 1, y: 0 }}
          transition={{ duration: 0.35, delay: entryDelay, ease: "easeOut" }}
          className="group glass-panel bg-white rounded-lg border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] p-5 cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all"
          role="button"
          tabIndex={isBlurred ? -1 : 0}
          aria-label={t("results.expandSummaryAria", { title: displayTitle })}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isBlurred) { e.preventDefault(); onExpand(card.id); } }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TypeIcon type="summary" />
            <CardLabel type="summary" />
            <ArrowUpRight className="w-3.5 h-3.5 text-[#0070d2] opacity-0 group-hover:opacity-100 transition-opacity ms-auto" />
          </div>
          <p className="text-base font-bold text-gray-800 mb-2">{displayTitle}</p>
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-4">{displayDesc}</p>
        </motion.div>

        <AnimatePresence>
          {isExpanded && (
            <>
              <motion.div
                key="backdrop"
                className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                onClick={() => !isEditing && onExpand(null)}
              />
              <div
                key="expanded-wrapper"
                style={{ position: "fixed", inset: 0, zIndex: 310, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}
              >
                <motion.div
                  layoutId={`card-${card.id}`}
                  className="bg-white border border-[#dddbda] rounded-lg shadow-2xl flex flex-col overflow-hidden"
                  style={{ width: "min(720px, 92vw)", maxHeight: "85vh", pointerEvents: "all" }}
                >
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                    <TypeIcon type="summary" />
                    <CardLabel type="summary" />
                    {!isEditing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onExpand(null); }}
                        className="ms-auto p-1.5 rounded hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0070d2]/40"
                        aria-label={t("results.closeEsc")}
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Body */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28, delay: 0.1 }}
                    className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
                  >
                    <h2 dir="auto" className="bidi-auto text-xl font-bold text-gray-800">{displayTitle}</h2>

                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">{t("results.editSummaryFieldLabel")}</label>
                          <textarea dir="auto" className={`${inputCls} bidi-auto`} rows={10} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} autoFocus />
                        </div>
                        {saveError && <p className="text-xs text-red-500">{saveError}</p>}
                        <div className="flex gap-2 pt-1">
                          <button onClick={handleSave} disabled={saving || !editDesc.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-white bg-[#0070d2] hover:bg-[#005fb2] disabled:opacity-50 transition-colors">
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            {t("common.save")}
                          </button>
                          <button onClick={cancelEdit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-gray-500 border border-[#dddbda] hover:bg-gray-50 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" />
                            {t("common.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p dir="auto" className="bidi-auto text-sm leading-relaxed text-gray-600">{displayDesc}</p>
                        <button
                          onClick={startEdit}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#0070d2] border border-[#b3d9f6] hover:bg-[#ecf5fe] transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          {t("results.editSummaryBtn")}
                        </button>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ─── Task compact (list row) ──────────────────────────────────────────────────
  return (
    <>
      <motion.div
        layoutId={`card-${card.id}`}
        onClick={() => !isBlurred && onExpand(card.id)}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: isBlurred ? 0.3 : isDone ? 0.65 : 1, x: 0 }}
        transition={{ duration: 0.25, delay: entryDelay, ease: "easeOut" }}
        className="px-5 py-3.5 flex items-center gap-3.5 hover:bg-[#fafaf9] transition-colors cursor-pointer group"
        role="button"
        tabIndex={isBlurred ? -1 : 0}
        aria-label={t("results.taskDetailsAria", { title: displayTitle })}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isBlurred) { e.preventDefault(); onExpand(card.id); } }}
      >
        {/* Status indicator */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isDone ? "bg-emerald-50 border border-emerald-200"
          : displayStatus === "in_progress" ? "bg-amber-50 border border-amber-200"
          : "bg-gray-50 border border-gray-200"
        }`}>
          {isDone
            ? <span className="text-emerald-500 text-xs font-bold">✓</span>
            : displayStatus === "in_progress"
              ? <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              : <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isDone ? "line-through text-gray-300" : "text-gray-800"}`}>
            {displayTitle}
          </p>
          {card.projectName && (
            <span className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <FolderOpen className="w-3 h-3 text-gray-300" />
              {card.projectName}
            </span>
          )}
        </div>

        {/* Status chip */}
        <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border flex-shrink-0 ${
          isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : displayStatus === "in_progress" ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-gray-100 text-gray-500 border-gray-200"
        }`}>
          {STATUS_LABELS[displayStatus]}
        </span>

        {/* Priority badge */}
        <Badge variant={priorityBadgeVariant[displayPriority]}>
          {PRIORITY_LABELS[displayPriority]}
        </Badge>

        {/* Quick done toggle */}
        <button
          onClick={handleCheckboxToggle}
          disabled={toggling}
          className="p-1 rounded hover:bg-[#ecf5fe] transition-colors flex-shrink-0 focus:outline-none"
          aria-label={isDone ? t("tasks.markIncomplete") : t("tasks.markComplete")}
        >
          {toggling ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#0070d2]" />
          ) : isDone ? (
            <CheckCircle2 className="w-4 h-4 text-[#04844b]" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-[#0070d2] transition-colors" />
          )}
        </button>
      </motion.div>

      {/* ── Expanded task modal ── */}
      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => !isEditing && onExpand(null)}
            />
            <div
              key="expanded-wrapper"
              style={{ position: "fixed", inset: 0, zIndex: 310, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}
            >
              <motion.div
                layoutId={`card-${card.id}`}
                className="bg-white border border-[#dddbda] rounded-lg shadow-2xl flex flex-col overflow-hidden"
                style={{ width: "min(680px, 92vw)", maxHeight: "85vh", pointerEvents: "all" }}
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isDone ? "bg-emerald-50 border border-emerald-200"
                    : displayStatus === "in_progress" ? "bg-amber-50 border border-amber-200"
                    : "bg-gray-50 border border-gray-200"
                  }`}>
                    {isDone
                      ? <span className="text-emerald-500 text-xs font-bold">✓</span>
                      : displayStatus === "in_progress"
                        ? <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        : <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300" />
                    }
                  </div>
                  <span className="text-xs font-medium text-gray-400">{t("results.cardTaskLabel")}</span>
                  {!isEditing && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onExpand(null); }}
                      className="ms-auto p-1.5 rounded hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0070d2]/40"
                      aria-label={t("results.closeEsc")}
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Body */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, delay: 0.1 }}
                  className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
                >
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">{t("editRequest.fieldTitle")}</label>
                        <input dir="auto" className={`${inputCls} bidi-auto`} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">{t("editRequest.fieldDescription")}</label>
                        <textarea dir="auto" className={`${inputCls} bidi-auto`} rows={4} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                      </div>
                      <div className="flex gap-4 flex-wrap">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">{t("editRequest.fieldPriority")}</label>
                          <select className={selectCls} value={editPriority} onChange={(e) => setEditPriority(e.target.value as TaskPriority)}>
                            <option value="low">{t("tasks.priorityLow")}</option>
                            <option value="medium">{t("tasks.priorityMedium")}</option>
                            <option value="high">{t("tasks.priorityHigh")}</option>
                            <option value="critical">{t("tasks.priorityCritical")}</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">{t("editRequest.fieldStatus")}</label>
                          <select className={selectCls} value={editStatus} onChange={(e) => setEditStatus(e.target.value as TaskStatus)}>
                            <option value="todo">{t("tasks.statusTodo")}</option>
                            <option value="in_progress">{t("tasks.statusInProgress")}</option>
                            <option value="done">{t("tasks.statusDone")}</option>
                          </select>
                        </div>
                      </div>
                      {saveError && <p className="text-xs text-red-500">{saveError}</p>}
                      <div className="flex gap-2 pt-1">
                        <button onClick={handleSave} disabled={saving || !editTitle.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-white bg-[#0070d2] hover:bg-[#005fb2] disabled:opacity-50 transition-colors">
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          {t("common.save")}
                        </button>
                        <button onClick={cancelEdit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-gray-500 border border-[#dddbda] hover:bg-gray-50 transition-colors">
                          <RotateCcw className="w-3.5 h-3.5" />
                          {t("common.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Title */}
                      <h2 dir="auto" className={`bidi-auto text-xl font-bold ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
                        {displayTitle}
                      </h2>

                      {/* Project */}
                      {card.projectName && (
                        <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-500 rounded-full px-3 py-1 text-xs font-medium border border-gray-200">
                          <FolderOpen className="w-3 h-3" />
                          {card.projectName}
                        </span>
                      )}

                      {/* Description */}
                      {displayDesc && (
                        <div>
                          <p className="text-xs font-medium text-gray-400 mb-2">{t("editRequest.fieldDescription")}</p>
                          <p dir="auto" className="bidi-auto text-sm leading-relaxed text-gray-600">{displayDesc}</p>
                        </div>
                      )}

                      {/* Meta chips */}
                      <div className="flex items-center gap-4 flex-wrap pt-1">
                        <div>
                          <p className="text-xs font-medium text-gray-400 mb-1.5">{t("editRequest.fieldPriority")}</p>
                          <Badge variant={priorityBadgeVariant[displayPriority]}>
                            {PRIORITY_LABELS[displayPriority]}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-400 mb-1.5">{t("editRequest.fieldStatus")}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${
                            isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : displayStatus === "in_progress" ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}>
                            {STATUS_LABELS[displayStatus]}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#0070d2] border border-[#b3d9f6] hover:bg-[#ecf5fe] transition-colors">
                          <Pencil className="w-3 h-3" />
                          {t("common.edit")}
                        </button>

                        {!confirmDelete ? (
                          <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-400 border border-red-200 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3 h-3" />
                            {t("common.delete")}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {deleteError && <span className="text-xs text-red-500">{deleteError}</span>}
                            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors">
                              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              {t("results.confirmDeleteShort")}
                            </button>
                            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                              {t("common.cancel")}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
