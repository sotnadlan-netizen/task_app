"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Session, Task } from "@/types";
import { CalendarClock, CalendarPlus, MicVocal, Pencil, Plus, X, XCircle } from "lucide-react";
import { buildGoogleCalendarUrlForTask } from "@/lib/calendar-url";
import { api } from "@/lib/api";
import { TaskSchedulePicker } from "./task-schedule-picker";

const priorityDot: Record<string, string> = {
  critical: "bg-red-400",
  high: "bg-amber-400",
  medium: "bg-sky-400",
  low: "bg-gray-300",
};

interface Props {
  selectedDate: string | null; // YYYY-MM-DD
  sessions: Session[];
  tasks: Task[];
  token: string;
  onClose: () => void;
  onMeetingClick: (session: Session) => void;
  onTaskUpdate: (updated: Task) => void;
}

function isoToDay(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time
}

export function DayDetailPanel({
  selectedDate,
  sessions,
  tasks,
  token,
  onClose,
  onMeetingClick,
  onTaskUpdate,
}: Props) {
  const [pickerTask, setPickerTask] = useState<Task | null>(null);
  const [showAddTaskMenu, setShowAddTaskMenu] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const daySessions = useMemo(() => {
    if (!selectedDate) return [];
    return sessions
      .filter((s) => isoToDay(s.created_at) === selectedDate)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [selectedDate, sessions]);

  const dayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasks
      .filter((t) => t.scheduled_at && isoToDay(t.scheduled_at) === selectedDate)
      .sort((a, b) => (a.scheduled_at || "").localeCompare(b.scheduled_at || ""));
  }, [selectedDate, tasks]);

  const unscheduledTasks = useMemo(
    () => tasks.filter((t) => !t.scheduled_at && t.status !== "done"),
    [tasks]
  );

  const clearTaskFromDay = async (t: Task) => {
    setClearingId(t.id);
    // Optimistic
    onTaskUpdate({ ...t, scheduled_at: null });
    try {
      await api.updateTask(t.id, { scheduled_at: "" }, token);
    } catch {
      // Rollback if server rejects
      onTaskUpdate({ ...t, scheduled_at: t.scheduled_at });
    } finally {
      setClearingId(null);
    }
  };

  return (
    <AnimatePresence>
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-lg border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] overflow-hidden"
          dir="rtl"
        >
          <div className="px-4 py-3 border-b border-[#dddbda] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 mb-0.5">תאריך נבחר</p>
              <p className="text-sm font-bold text-[#080707]">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("he-IL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              aria-label="סגור"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Meetings */}
            <section>
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MicVocal className="w-3 h-3" />
                פגישות ({daySessions.length})
              </h4>
              {daySessions.length === 0 ? (
                <p className="text-xs text-gray-300 px-1">— אין פגישות —</p>
              ) : (
                <div className="space-y-1.5">
                  {daySessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onMeetingClick(s)}
                      className="w-full text-right p-2.5 rounded bg-sky-50/60 hover:bg-sky-100/60 border border-transparent hover:border-sky-200 text-sm transition-all"
                    >
                      <p className="font-medium text-gray-800 truncate">
                        {s.title || "פגישה ללא שם"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(s.created_at).toLocaleTimeString("he-IL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Tasks */}
            <section>
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CalendarClock className="w-3 h-3" />
                משימות מתוזמנות ({dayTasks.length})
              </h4>
              {dayTasks.length === 0 ? (
                <p className="text-xs text-gray-300 px-1">— אין משימות —</p>
              ) : (
                <div className="space-y-1.5">
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="w-full p-2.5 rounded bg-[#ecf5fe]/60 border border-transparent hover:border-[#b3d9f6] transition-all flex items-center gap-2"
                    >
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[t.priority] || priorityDot.medium}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            t.status === "done"
                              ? "line-through text-gray-400"
                              : "text-gray-800"
                          }`}
                        >
                          {t.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(t.scheduled_at!).toLocaleTimeString("he-IL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {(() => {
                        const gcalUrl = buildGoogleCalendarUrlForTask(t);
                        return gcalUrl ? (
                          <a
                            href={gcalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-[#ecf5fe] transition-colors flex-shrink-0"
                            aria-label="הוסף ליומן גוגל"
                            title="הוסף ליומן גוגל"
                          >
                            <CalendarPlus className="w-3 h-3 text-[#0070d2]" />
                          </a>
                        ) : null;
                      })()}
                      <button
                        onClick={() => setPickerTask(t)}
                        className="p-1.5 rounded hover:bg-[#ecf5fe] transition-colors flex-shrink-0"
                        aria-label="ערוך תזמון"
                        title="ערוך תזמון"
                      >
                        <Pencil className="w-3 h-3 text-[#0070d2]" />
                      </button>
                      <button
                        onClick={() => clearTaskFromDay(t)}
                        disabled={clearingId === t.id}
                        className="p-1.5 rounded hover:bg-[#fde9e7] transition-colors flex-shrink-0 disabled:opacity-40"
                        aria-label="הסר מהיום"
                        title="הסר מהיום"
                      >
                        <XCircle className="w-3.5 h-3.5 text-[#c23934]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Add task to this day */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3 h-3" />
                  הוסף משימה ליום זה
                </h4>
                {unscheduledTasks.length > 0 && (
                  <button
                    onClick={() => setShowAddTaskMenu((v) => !v)}
                    className="text-[11px] font-medium text-[#0070d2] hover:text-[#005fb2]"
                  >
                    {showAddTaskMenu ? "סגור" : `הצג (${unscheduledTasks.length})`}
                  </button>
                )}
              </div>
              {unscheduledTasks.length === 0 ? (
                <p className="text-xs text-gray-300 px-1">— אין משימות ללא תזמון —</p>
              ) : showAddTaskMenu ? (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {unscheduledTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setPickerTask(t);
                        setShowAddTaskMenu(false);
                      }}
                      className="w-full text-right p-2 rounded bg-gray-50 hover:bg-[#ecf5fe] border border-transparent hover:border-[#b3d9f6] transition-all flex items-center gap-2"
                    >
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[t.priority] || priorityDot.medium}`}
                      />
                      <span className="text-xs font-medium text-gray-700 truncate flex-1">
                        {t.title}
                      </span>
                      {t.deadline && (
                        <span className="text-[10px] text-gray-400 truncate max-w-[100px]">
                          {t.deadline}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </motion.div>
      )}

      {pickerTask && (
        <TaskSchedulePicker
          task={pickerTask}
          token={token}
          defaultDate={!pickerTask.scheduled_at ? selectedDate ?? undefined : undefined}
          onClose={() => setPickerTask(null)}
          onSaved={onTaskUpdate}
        />
      )}
    </AnimatePresence>
  );
}
