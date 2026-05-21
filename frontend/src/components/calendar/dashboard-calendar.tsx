"use client";

import { Fragment, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Session, Task } from "@/types";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MicVocal,
  CheckSquare,
} from "lucide-react";
import { api } from "@/lib/api";
import { DayDetailPanel } from "./day-detail-panel";

const dayHeaders = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const WEEK_HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 – 21:00

function isoToDay(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE"); // YYYY-MM-DD local
}

function isoToHour(iso: string): number {
  return new Date(iso).getHours();
}

function todayLocal(): string {
  return new Date().toLocaleDateString("sv-SE");
}

function startOfWeek(anchor: Date): Date {
  const d = new Date(anchor);
  d.setDate(anchor.getDate() - anchor.getDay()); // Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateToYMD(d: Date): string {
  return d.toLocaleDateString("sv-SE");
}

interface Props {
  sessions: Session[];
  tasks: Task[];
  token: string;
  onMeetingClick: (session: Session) => void;
  onTaskUpdate: (updated: Task) => void;
}

export function DashboardCalendar({
  sessions,
  tasks,
  token,
  onMeetingClick,
  onTaskUpdate,
}: Props) {
  const [view, setView] = useState<"month" | "week">("month");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(todayLocal());
  const [dropError, setDropError] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null); // "YYYY-MM-DD-HH"

  const sessionsByDay = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach((s) => {
      const day = isoToDay(s.created_at);
      if (!map[day]) map[day] = [];
      map[day].push(s);
    });
    return map;
  }, [sessions]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (!t.scheduled_at) return;
      const day = isoToDay(t.scheduled_at);
      if (!map[day]) map[day] = [];
      map[day].push(t);
    });
    return map;
  }, [tasks]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayLocal();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const goToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setWeekStart(startOfWeek(now));
    setSelectedDay(todayLocal());
  };

  const persistSchedule = async (task: Task, target: Date) => {
    const iso = target.toISOString();
    onTaskUpdate({ ...task, scheduled_at: iso });
    setSelectedDay(dateToYMD(target));
    try {
      const updated = (await api.updateTask(task.id, { scheduled_at: iso }, token)) as Task;
      onTaskUpdate({ ...task, ...updated, scheduled_at: iso });
    } catch (err) {
      onTaskUpdate({ ...task, scheduled_at: task.scheduled_at });
      setDropError(err instanceof Error ? err.message : "שגיאה בעדכון התזמון");
      setTimeout(() => setDropError(null), 4000);
    }
  };

  const handleDrop = async (e: React.DragEvent, dayStr: string) => {
    e.preventDefault();
    setDragOverDay(null);
    const taskId = e.dataTransfer.getData("application/x-task-id");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Default new scheduled time: 09:00 of the dropped day, or preserve original time
    const target = new Date(`${dayStr}T00:00:00`);
    if (task.scheduled_at) {
      const orig = new Date(task.scheduled_at);
      target.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
    } else {
      target.setHours(9, 0, 0, 0);
    }
    await persistSchedule(task, target);
  };

  const handleSlotDrop = async (e: React.DragEvent, dayStr: string, hour: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    const taskId = e.dataTransfer.getData("application/x-task-id");
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const target = new Date(`${dayStr}T00:00:00`);
    target.setHours(hour, 0, 0, 0);
    await persistSchedule(task, target);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4"
      dir="rtl"
    >
      {/* Month grid */}
      <div className="glass-panel bg-white rounded-lg border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#dddbda] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#0070d2]" />
            <h2 className="text-base font-bold text-[#080707]">
              לוח שנה — פגישות ומשימות
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
              <button
                onClick={() => setView("month")}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  view === "month"
                    ? "bg-white text-[#0070d2] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                חודש
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  view === "week"
                    ? "bg-white text-[#0070d2] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                שבוע
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={view === "month" ? nextMonth : nextWeek}
                className="p-1.5 rounded hover:bg-[#ecf5fe] transition-colors"
                aria-label={view === "month" ? "חודש הבא" : "שבוע הבא"}
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
              <span className="font-semibold text-gray-700 text-sm min-w-[140px] text-center">
                {view === "month"
                  ? currentMonth.toLocaleString("he-IL", { month: "long", year: "numeric" })
                  : (() => {
                      const end = new Date(weekStart);
                      end.setDate(end.getDate() + 6);
                      return `${weekStart.toLocaleDateString("he-IL", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("he-IL", { day: "numeric", month: "short" })}`;
                    })()}
              </span>
              <button
                onClick={view === "month" ? prevMonth : prevWeek}
                className="p-1.5 rounded hover:bg-[#ecf5fe] transition-colors"
                aria-label={view === "month" ? "חודש קודם" : "שבוע קודם"}
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={goToday}
                className="mr-1 px-2.5 py-1 text-xs font-medium text-[#0070d2] border border-[#b3d9f6] rounded hover:bg-[#ecf5fe] transition-colors"
              >
                היום
              </button>
            </div>
          </div>
        </div>

        {dropError && (
          <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-xs text-red-600">
            {dropError}
          </div>
        )}

        {view === "month" && (
        <div className="grid grid-cols-7 text-center px-2 pt-2">
          {dayHeaders.map((d) => (
            <div key={d} className="text-[10px] font-medium text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>
        )}

        {view === "month" && (
        <div className="grid grid-cols-7 gap-1 p-2">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const daySessions = sessionsByDay[dateStr] || [];
            const dayTasks = tasksByDay[dateStr] || [];
            const isSelected = selectedDay === dateStr;
            const isToday = dateStr === today;
            const isDragOver = dragOverDay === dateStr;

            return (
              <button
                key={day}
                onClick={() =>
                  setSelectedDay(isSelected ? null : dateStr)
                }
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverDay !== dateStr) setDragOverDay(dateStr);
                }}
                onDragLeave={() => {
                  if (dragOverDay === dateStr) setDragOverDay(null);
                }}
                onDrop={(e) => handleDrop(e, dateStr)}
                className={`relative aspect-square p-1 rounded text-right transition-all overflow-hidden
                  ${
                    isSelected
                      ? "bg-[#ecf5fe] ring-2 ring-[#0070d2]"
                      : isToday
                        ? "bg-[#ecf5fe]/60 ring-1 ring-[#b3d9f6]"
                        : "hover:bg-gray-50"
                  }
                  ${isDragOver ? "ring-2 ring-emerald-400 bg-emerald-50/60" : ""}
                `}
              >
                <div
                  className={`text-[11px] font-semibold ${
                    isToday ? "text-[#0070d2]" : "text-gray-700"
                  }`}
                >
                  {day}
                </div>
                {(() => {
                  const MAX_VISIBLE = 4;
                  const visibleSessions = daySessions.slice(0, MAX_VISIBLE);
                  const remainingSlots = Math.max(0, MAX_VISIBLE - visibleSessions.length);
                  const visibleTasks = dayTasks.slice(0, remainingSlots);
                  const hidden =
                    (daySessions.length - visibleSessions.length) +
                    (dayTasks.length - visibleTasks.length);
                  return (
                    <div className="flex flex-col gap-0.5 mt-0.5 items-start">
                      {visibleSessions.map((s) => (
                        <span
                          key={s.id}
                          className="w-full truncate text-[9px] leading-tight px-1 py-[1px] rounded bg-sky-100 text-sky-700 text-right"
                          title={s.title || "פגישה"}
                        >
                          • {s.title || "פגישה"}
                        </span>
                      ))}
                      {visibleTasks.map((t) => (
                        <span
                          key={t.id}
                          className="w-full truncate text-[9px] leading-tight px-1 py-[1px] rounded bg-[#d9e3f0] text-[#16325c] text-right"
                          title={t.title}
                        >
                          ✓ {t.title}
                        </span>
                      ))}
                      {hidden > 0 && (
                        <span className="text-[9px] font-semibold text-[#0070d2]">
                          +{hidden} נוספים
                        </span>
                      )}
                    </div>
                  );
                })()}
              </button>
            );
          })}
        </div>
        )}

        {view === "week" && (() => {
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            return d;
          });
          return (
            <div className="overflow-x-auto">
              {/* Day header row */}
              <div className="grid grid-cols-[44px_repeat(7,minmax(80px,1fr))] gap-px bg-gray-100 border-b border-gray-100">
                <div className="bg-white" />
                {days.map((d) => {
                  const ymd = dateToYMD(d);
                  const isToday = ymd === today;
                  const isSelected = selectedDay === ymd;
                  return (
                    <button
                      key={ymd}
                      onClick={() => setSelectedDay(isSelected ? null : ymd)}
                      className={`bg-white p-2 text-center transition-colors ${
                        isSelected ? "bg-[#ecf5fe]" : isToday ? "bg-[#ecf5fe]/60" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-[10px] text-gray-400">
                        {d.toLocaleDateString("he-IL", { weekday: "short" })}
                      </div>
                      <div className={`text-sm font-bold ${isToday ? "text-[#0070d2]" : "text-gray-800"}`}>
                        {d.getDate()}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Hour rows */}
              <div className="grid grid-cols-[44px_repeat(7,minmax(80px,1fr))] gap-px bg-gray-100">
                {WEEK_HOURS.map((h) => (
                  <Fragment key={h}>
                    <div className="bg-white text-[10px] text-gray-400 text-center pt-1">
                      {String(h).padStart(2, "0")}:00
                    </div>
                    {days.map((d) => {
                      const ymd = dateToYMD(d);
                      const slotKey = `${ymd}-${h}`;
                      const isDragOver = dragOverSlot === slotKey;
                      const slotSessions = (sessionsByDay[ymd] || []).filter(
                        (s) => isoToHour(s.created_at) === h
                      );
                      const slotTasks = (tasksByDay[ymd] || []).filter(
                        (t) => t.scheduled_at && isoToHour(t.scheduled_at) === h
                      );
                      return (
                        <div
                          key={slotKey}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverSlot !== slotKey) setDragOverSlot(slotKey);
                          }}
                          onDragLeave={() => {
                            if (dragOverSlot === slotKey) setDragOverSlot(null);
                          }}
                          onDrop={(e) => handleSlotDrop(e, ymd, h)}
                          className={`bg-white min-h-[40px] p-1 transition-colors ${
                            isDragOver ? "ring-2 ring-inset ring-emerald-400 bg-emerald-50/60" : ""
                          }`}
                        >
                          {slotSessions.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => onMeetingClick(s)}
                              className="w-full text-right block text-[10px] leading-tight px-1.5 py-0.5 mb-0.5 rounded bg-sky-100 text-sky-700 hover:bg-sky-200 truncate"
                              title={s.title || "פגישה"}
                            >
                              {s.title || "פגישה"}
                            </button>
                          ))}
                          {slotTasks.map((t) => (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("application/x-task-id", t.id);
                                e.dataTransfer.setData("text/plain", t.id);
                              }}
                              className="w-full cursor-grab active:cursor-grabbing text-right block text-[10px] leading-tight px-1.5 py-0.5 mb-0.5 rounded bg-[#d9e3f0] text-[#16325c] truncate"
                              title={t.title}
                            >
                              ✓ {t.title}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="px-5 py-2.5 border-t border-[#dddbda] flex items-center gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-sky-200" />
            <MicVocal className="w-3 h-3" /> פגישות
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#c3d3e8]" />
            <CheckSquare className="w-3 h-3" /> משימות
          </span>
          <span className="text-gray-300 mr-auto">
            גרור משימה לתא יום כדי לתזמן
          </span>
        </div>
      </div>

      {/* Day detail panel */}
      <DayDetailPanel
        selectedDate={selectedDay}
        sessions={sessions}
        tasks={tasks}
        token={token}
        onClose={() => setSelectedDay(null)}
        onMeetingClick={onMeetingClick}
        onTaskUpdate={onTaskUpdate}
      />
    </motion.div>
  );
}
