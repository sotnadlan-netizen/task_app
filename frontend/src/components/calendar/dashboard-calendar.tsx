"use client";

import { Fragment, useMemo, useState } from "react";
import { Calendar as CalendarIcon, CheckSquare, ChevronLeft, ChevronRight, MicVocal } from "lucide-react";
import type { Session, Task } from "@/types";
import { useLanguage } from "@/providers/language-provider";
import { localeOf } from "@/lib/i18n";
import {
  WEEK_HOURS,
  dateToYMD,
  isoToDay,
  isoToHour,
  startOfWeek,
  todayLocal,
} from "@/lib/calendar";
import { useCalendarDnd } from "./calendar-dnd";
import { DayDetailPanel } from "./day-detail-panel";

interface Props {
  sessions: Session[];
  tasks: Task[];
  token: string;
  onMeetingClick: (s: Session) => void;
  onTaskUpdate: (u: Task) => void;
}

export function DashboardCalendar({ sessions, tasks, token, onMeetingClick, onTaskUpdate }: Props) {
  const { t, lang } = useLanguage();
  const loc = localeOf(lang);
  const { startDrag, consumeClick } = useCalendarDnd();
  const [view, setView] = useState<"month" | "week">("month");
  const [currentMonth, setCurrentMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(todayLocal());

  const sessionsByDay = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach((s) => { const d = isoToDay(s.created_at); (map[d] ||= []).push(s); });
    return map;
  }, [sessions]);
  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => { if (!t.scheduled_at) return; const d = isoToDay(t.scheduled_at); (map[d] ||= []).push(t); });
    return map;
  }, [tasks]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayLocal();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday = () => { const n = new Date(); setCurrentMonth(new Date(n.getFullYear(), n.getMonth(), 1)); setWeekStart(startOfWeek(n)); setSelectedDay(todayLocal()); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <div className="rounded border border-[#dddbda] bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#dddbda] flex items-center justify-between gap-3 flex-wrap bg-[#fafaf9]">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#0070d2]" />
            <h2 className="text-[13px] font-semibold text-[#080707]">{t("calendar.headerTitle")}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white border border-[#dddbda] rounded p-0.5">
              <button onClick={() => setView("month")} className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${view === "month" ? "bg-[#0070d2] text-white" : "text-[#706e6b] hover:bg-[#f3f3f3]"}`}>{t("calendar.month")}</button>
              <button onClick={() => setView("week")} className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${view === "week" ? "bg-[#0070d2] text-white" : "text-[#706e6b] hover:bg-[#f3f3f3]"}`}>{t("calendar.week")}</button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={view === "month" ? nextMonth : nextWeek} className="p-1.5 rounded hover:bg-[#ecf5fe]" aria-label={t("calendar.next")}><ChevronRight className="w-4 h-4 text-[#706e6b] rtl:-scale-x-100" /></button>
              <span className="font-semibold text-[#080707] text-[13px] min-w-[140px] text-center">
                {view === "month"
                  ? currentMonth.toLocaleString(loc, { month: "long", year: "numeric" })
                  : (() => { const end = new Date(weekStart); end.setDate(end.getDate() + 6); return `${weekStart.toLocaleDateString(loc, { day: "numeric", month: "short" })} – ${end.toLocaleDateString(loc, { day: "numeric", month: "short" })}`; })()}
              </span>
              <button onClick={view === "month" ? prevMonth : prevWeek} className="p-1.5 rounded hover:bg-[#ecf5fe]" aria-label={t("calendar.prev")}><ChevronLeft className="w-4 h-4 text-[#706e6b] rtl:-scale-x-100" /></button>
              <button onClick={goToday} className="ms-1 px-2.5 py-1 text-[11px] font-semibold text-[#0070d2] border border-[#dddbda] rounded hover:bg-[#ecf5fe]">{t("calendar.today")}</button>
            </div>
          </div>
        </div>

        {view === "month" && (
          <>
            <div className="grid grid-cols-7 text-center px-2 pt-2">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="text-[10px] font-semibold text-[#706e6b] py-1">{t(`calendar.d${i}`)}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 p-2">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} className="aspect-square" />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const daySessions = sessionsByDay[dateStr] || [];
                const dayTasks = tasksByDay[dateStr] || [];
                const isSelected = selectedDay === dateStr;
                const isToday = dateStr === today;
                const MAX = 4;
                const visS = daySessions.slice(0, MAX);
                const visT = dayTasks.slice(0, Math.max(0, MAX - visS.length));
                const hidden = daySessions.length - visS.length + (dayTasks.length - visT.length);
                return (
                  <button
                    key={day}
                    data-cal-day={dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={`relative aspect-square p-1 rounded text-start transition-all overflow-hidden border ${
                      isSelected ? "bg-[#ecf5fe] border-[#0070d2]" : isToday ? "bg-[#f4f9fe] border-[#cfe3fa]" : "border-transparent hover:bg-[#f3f3f3]"
                    }`}
                  >
                    <div className={`text-[11px] font-semibold ${isToday ? "text-[#0070d2]" : "text-[#3e3e3c]"}`}>{day}</div>
                    <div className="flex flex-col gap-0.5 mt-0.5 items-start">
                      {visS.map((s) => (
                        <span key={s.id} className="w-full truncate text-[9px] leading-tight px-1 py-[1px] rounded bg-[#dceffb] text-[#0070d2] text-start" title={s.title || t("calendar.meeting")}>• {s.title || t("calendar.meeting")}</span>
                      ))}
                      {visT.map((vt) => (
                        <span key={vt.id} className="w-full truncate text-[9px] leading-tight px-1 py-[1px] rounded bg-[#fdecdd] text-[#c4521a] text-start" title={vt.title}>✓ {vt.title}</span>
                      ))}
                      {hidden > 0 && <span className="text-[9px] font-semibold text-[#0070d2]">{t("calendar.more", { count: hidden })}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {view === "week" && (() => {
          const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });
          return (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[44px_repeat(7,minmax(80px,1fr))] gap-px bg-[#dddbda] border-b border-[#dddbda]">
                <div className="bg-white" />
                {days.map((d) => {
                  const ymd = dateToYMD(d);
                  const isToday = ymd === today;
                  const isSel = selectedDay === ymd;
                  return (
                    <button key={ymd} onClick={() => setSelectedDay(isSel ? null : ymd)} className={`p-2 text-center transition-colors ${isSel ? "bg-[#ecf5fe]" : isToday ? "bg-[#f4f9fe]" : "bg-white hover:bg-[#f3f3f3]"}`}>
                      <div className="text-[10px] text-[#706e6b]">{d.toLocaleDateString(loc, { weekday: "short" })}</div>
                      <div className={`text-[13px] font-bold ${isToday ? "text-[#0070d2]" : "text-[#080707]"}`}>{d.getDate()}</div>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-[44px_repeat(7,minmax(80px,1fr))] gap-px bg-[#dddbda]">
                {WEEK_HOURS.map((h) => (
                  <Fragment key={h}>
                    <div className="bg-white text-[10px] text-[#706e6b] text-center pt-1">{String(h).padStart(2, "0")}:00</div>
                    {days.map((d) => {
                      const ymd = dateToYMD(d);
                      const slotKey = `${ymd}-${h}`;
                      const slotSessions = (sessionsByDay[ymd] || []).filter((s) => isoToHour(s.created_at) === h);
                      const slotTasks = (tasksByDay[ymd] || []).filter((t) => t.scheduled_at && isoToHour(t.scheduled_at) === h);
                      return (
                        <div
                          key={slotKey}
                          data-cal-slot={slotKey}
                          className="bg-white min-h-[40px] p-1 transition-colors"
                        >
                          {slotSessions.map((s) => (
                            <button key={s.id} onClick={() => onMeetingClick(s)} className="w-full text-start block text-[10px] leading-tight px-1.5 py-0.5 mb-0.5 rounded bg-[#dceffb] text-[#0070d2] hover:bg-[#c5e3fa] truncate" title={s.title || t("calendar.meeting")}>{s.title || t("calendar.meeting")}</button>
                          ))}
                          {slotTasks.map((st) => (
                            <div key={st.id} onPointerDown={(e) => startDrag(st, e)} onClick={() => { if (consumeClick()) return; }} style={{ touchAction: "none" }} className="w-full cursor-grab active:cursor-grabbing text-start block text-[10px] leading-tight px-1.5 py-0.5 mb-0.5 rounded bg-[#fdecdd] text-[#c4521a] truncate" title={st.title}>✓ {st.title}</div>
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

        <div className="px-4 py-2 border-t border-[#dddbda] flex items-center gap-4 text-[11px] text-[#706e6b]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#dceffb]" /><MicVocal className="w-3 h-3" /> {t("calendar.legendMeetings")}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#fdecdd]" /><CheckSquare className="w-3 h-3" /> {t("calendar.legendTasks")}</span>
          <span className="text-[#aeb0b3] ms-auto">{t("calendar.dragHint")}</span>
        </div>
      </div>

      <DayDetailPanel selectedDate={selectedDay} sessions={sessions} tasks={tasks} token={token} onClose={() => setSelectedDay(null)} onMeetingClick={onMeetingClick} onTaskUpdate={onTaskUpdate} />
    </div>
  );
}
