"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, CalendarPlus, MicVocal, Pencil, Plus, X, XCircle } from "lucide-react";
import type { Session, Task } from "@/types";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";
import { localeOf } from "@/lib/i18n";
import { isoToDay, priorityDot } from "@/lib/calendar";
import { buildGoogleCalendarUrlForTask } from "@/lib/calendar-url";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { TaskSchedulePicker } from "./task-schedule-picker";

interface Props {
  selectedDate: string | null; // YYYY-MM-DD
  sessions: Session[];
  tasks: Task[];
  token: string;
  onClose: () => void;
  onMeetingClick: (s: Session) => void;
  onTaskUpdate: (u: Task) => void;
}

export function DayDetailPanel({ selectedDate, sessions, tasks, token, onClose, onMeetingClick, onTaskUpdate }: Props) {
  const { t, lang } = useLanguage();
  const loc = localeOf(lang);
  const isDesktop = useIsDesktop();
  const [pickerTask, setPickerTask] = useState<Task | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const daySessions = useMemo(() => !selectedDate ? [] : sessions.filter((s) => isoToDay(s.created_at) === selectedDate).sort((a, b) => a.created_at.localeCompare(b.created_at)), [selectedDate, sessions]);
  const dayTasks = useMemo(() => !selectedDate ? [] : tasks.filter((t) => t.scheduled_at && isoToDay(t.scheduled_at) === selectedDate).sort((a, b) => (a.scheduled_at || "").localeCompare(b.scheduled_at || "")), [selectedDate, tasks]);
  const unscheduled = useMemo(() => tasks.filter((t) => !t.scheduled_at && t.status !== "done"), [tasks]);

  const clearFromDay = async (t: Task) => {
    setClearingId(t.id);
    onTaskUpdate({ ...t, scheduled_at: null });
    try { await api.updateTask(t.id, { scheduled_at: "" }, token); }
    catch { onTaskUpdate({ ...t, scheduled_at: t.scheduled_at }); }
    finally { setClearingId(null); }
  };

  if (!selectedDate) return null;

  const panel = (
    <>
        <div className="px-4 py-2.5 border-b border-[#dddbda] flex items-center justify-between bg-[#fafaf9]">
          <div>
            <p className="text-[10px] font-semibold text-[#706e6b] uppercase tracking-wide mb-0.5">{t("calendar.selectedDate")}</p>
            <p className="text-[13px] font-bold text-[#080707]">{new Date(selectedDate + "T00:00:00").toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#f3f3f3]" aria-label={t("common.close")}><X className="w-4 h-4 text-[#706e6b]" /></button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1 lg:flex-none lg:max-h-[60vh]">
          <section>
            <h4 className="text-[10px] font-semibold text-[#706e6b] uppercase tracking-wide mb-2 flex items-center gap-1.5"><MicVocal className="w-3 h-3" /> {t("calendar.meetingsCount", { count: daySessions.length })}</h4>
            {daySessions.length === 0 ? <p className="text-[11px] text-[#aeb0b3] px-1">{t("calendar.noMeetings")}</p> : (
              <div className="space-y-1.5">
                {daySessions.map((s) => (
                  <button key={s.id} onClick={() => onMeetingClick(s)} className="w-full text-start p-2.5 rounded bg-[#f4f9fe] hover:bg-[#ecf5fe] border border-transparent hover:border-[#cfe3fa] text-[13px] transition-all">
                    <p className="font-medium text-[#080707] truncate">{s.title || t("meetings.untitled")}</p>
                    <p className="text-[11px] text-[#706e6b] mt-0.5">{new Date(s.created_at).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
          <section>
            <h4 className="text-[10px] font-semibold text-[#706e6b] uppercase tracking-wide mb-2 flex items-center gap-1.5"><CalendarClock className="w-3 h-3" /> {t("calendar.scheduledTasksCount", { count: dayTasks.length })}</h4>
            {dayTasks.length === 0 ? <p className="text-[11px] text-[#aeb0b3] px-1">{t("calendar.noTasks")}</p> : (
              <div className="space-y-1.5">
                {dayTasks.map((dt) => {
                  const gcal = buildGoogleCalendarUrlForTask(dt);
                  return (
                    <div key={dt.id} className="w-full p-2.5 rounded bg-[#fdf6f0] border border-[#f5e3d2] flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[dt.priority] || priorityDot.medium}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-medium truncate ${dt.status === "done" ? "line-through text-[#aeb0b3]" : "text-[#080707]"}`}>{dt.title}</p>
                        <p className="text-[11px] text-[#706e6b] mt-0.5">{new Date(dt.scheduled_at!).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      {gcal && <a href={gcal} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-[#ecf5fe]" title={t("schedule.addToGoogleCalendar")}><CalendarPlus className="w-3 h-3 text-[#0070d2]" /></a>}
                      <button onClick={() => setPickerTask(dt)} className="p-1.5 rounded hover:bg-[#ecf5fe]" title={t("calendar.editSchedule")}><Pencil className="w-3 h-3 text-[#0070d2]" /></button>
                      <button onClick={() => clearFromDay(dt)} disabled={clearingId === dt.id} className="p-1.5 rounded hover:bg-[#fde9e8] disabled:opacity-40" title={t("calendar.removeFromDay")}><XCircle className="w-3.5 h-3.5 text-[#c23934]" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-semibold text-[#706e6b] uppercase tracking-wide flex items-center gap-1.5"><Plus className="w-3 h-3" /> {t("calendar.addTaskToDay")}</h4>
              {unscheduled.length > 0 && <button onClick={() => setShowAddMenu((v) => !v)} className="text-[11px] font-semibold text-[#0070d2] hover:underline">{showAddMenu ? t("common.close") : t("calendar.show", { count: unscheduled.length })}</button>}
            </div>
            {unscheduled.length === 0 ? <p className="text-[11px] text-[#aeb0b3] px-1">{t("calendar.noUnscheduled")}</p> : showAddMenu ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {unscheduled.map((ut) => (
                  <button key={ut.id} onClick={() => { setPickerTask(ut); setShowAddMenu(false); }} className="w-full text-start p-2 rounded bg-[#fafaf9] hover:bg-[#ecf5fe] border border-transparent hover:border-[#cfe3fa] transition-all flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[ut.priority] || priorityDot.medium}`} />
                    <span className="text-[12px] font-medium text-[#3e3e3c] truncate flex-1">{ut.title}</span>
                    {ut.deadline && <span className="text-[10px] text-[#706e6b] truncate max-w-[100px]">{ut.deadline}</span>}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        </div>
    </>
  );

  return (
    <>
      {isDesktop ? (
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded border border-[#dddbda] bg-white overflow-hidden"
        >
          {panel}
        </motion.div>
      ) : (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="absolute top-0 bottom-0 end-0 w-[88%] max-w-sm bg-white shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden"
            role="dialog"
            aria-label={t("calendar.selectedDate")}
          >
            {panel}
          </motion.aside>
        </div>
      )}
      {pickerTask && (
        <TaskSchedulePicker
          task={pickerTask}
          token={token}
          owningSession={sessions.find((s) => s.id === pickerTask.session_id)}
          defaultDate={!pickerTask.scheduled_at ? selectedDate ?? undefined : undefined}
          onClose={() => setPickerTask(null)}
          onSaved={onTaskUpdate}
        />
      )}
    </>
  );
}
