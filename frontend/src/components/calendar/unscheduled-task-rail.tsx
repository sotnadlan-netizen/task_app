"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Hand } from "lucide-react";
import type { Session, Task } from "@/types";
import { useLanguage } from "@/providers/language-provider";
import { priorityDot } from "@/lib/calendar";
import { useCalendarDnd } from "./calendar-dnd";
import { TaskSchedulePicker } from "./task-schedule-picker";

interface Props {
  tasks: Task[];
  sessions: Session[];
  token: string;
  onTaskUpdate: (u: Task) => void;
}

export function UnscheduledTaskRail({ tasks, sessions, token, onTaskUpdate }: Props) {
  const { t } = useLanguage();
  const { startDrag, consumeClick } = useCalendarDnd();
  const [pickerTask, setPickerTask] = useState<Task | null>(null);
  const unscheduled = useMemo(() => tasks.filter((tk) => !tk.scheduled_at && tk.status !== "done"), [tasks]);

  if (unscheduled.length === 0) {
    return (
      <div className="rounded border border-[#dddbda] bg-[#fafaf9] px-4 py-3 text-[13px] text-[#706e6b] flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-[#aeb0b3]" /> {t("calendar.allScheduled")}
      </div>
    );
  }

  return (
    <>
      <div className="rounded border border-[#dddbda] bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#dddbda] flex items-center gap-2 bg-[#fafaf9]">
          <Hand className="w-4 h-4 text-[#0070d2]" />
          <h3 className="text-[13px] font-semibold text-[#080707]">{t("calendar.unscheduledTitle")}</h3>
          <span className="text-[11px] text-[#706e6b] ms-1">{t("calendar.unscheduledHint", { count: unscheduled.length })}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {unscheduled.map((tk) => (
            <button
              key={tk.id}
              type="button"
              onPointerDown={(e) => startDrag(tk, e)}
              onClick={() => { if (consumeClick()) return; setPickerTask(tk); }}
              style={{ touchAction: "none" }}
              className="flex-shrink-0 max-w-[180px] cursor-grab active:cursor-grabbing px-3 py-2 rounded border border-[#dddbda] bg-white text-start text-[12px] font-medium text-[#3e3e3c] hover:border-[#0070d2] hover:shadow-sm transition-all"
              aria-label={t("calendar.scheduleAria", { title: tk.title })}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[tk.priority] || priorityDot.medium}`} />
                <span className="truncate">{tk.title}</span>
              </div>
              {tk.deadline && <p className="text-[10px] text-[#706e6b] truncate mt-0.5">{tk.deadline}</p>}
            </button>
          ))}
        </div>
      </div>
      {pickerTask && (
        <TaskSchedulePicker
          task={pickerTask}
          token={token}
          owningSession={sessions.find((s) => s.id === pickerTask.session_id)}
          onClose={() => setPickerTask(null)}
          onSaved={onTaskUpdate}
        />
      )}
    </>
  );
}
