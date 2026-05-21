"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Task } from "@/types";
import { CalendarClock, Hand } from "lucide-react";
import { TaskSchedulePicker } from "./task-schedule-picker";

const priorityRing: Record<string, string> = {
  critical: "ring-red-200 bg-red-50 text-red-700",
  high: "ring-amber-200 bg-amber-50 text-amber-700",
  medium: "ring-sky-200 bg-sky-50 text-sky-700",
  low: "ring-gray-200 bg-gray-50 text-gray-600",
};

interface Props {
  tasks: Task[];
  token: string;
  onTaskUpdate: (updated: Task) => void;
}

export function UnscheduledTaskRail({ tasks, token, onTaskUpdate }: Props) {
  const [pickerTask, setPickerTask] = useState<Task | null>(null);

  const unscheduled = useMemo(
    () => tasks.filter((t) => !t.scheduled_at && t.status !== "done"),
    [tasks]
  );

  if (unscheduled.length === 0) {
    return (
      <div className="glass-panel bg-white rounded-lg border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] px-5 py-4 text-sm text-gray-400 flex items-center gap-2" dir="rtl">
        <CalendarClock className="w-4 h-4 text-gray-300" />
        כל המשימות מתוזמנות 🎉
      </div>
    );
  }

  const onDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-task-id", task.id);
    e.dataTransfer.setData("text/plain", task.id);
  };

  return (
    <>
      <div className="glass-panel bg-white rounded-lg border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] overflow-hidden" dir="rtl">
        <div className="px-5 py-3 border-b border-[#dddbda] flex items-center gap-2">
          <Hand className="w-4 h-4 text-[#0070d2]" />
          <h3 className="text-sm font-bold text-[#080707]">משימות ללא תזמון</h3>
          <span className="text-xs text-gray-400 mr-1">
            ({unscheduled.length}) — גרור ליום ביומן או לחץ לתזמון
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto px-5 py-3">
          {unscheduled.map((t) => (
            <motion.button
              key={t.id}
              type="button"
              draggable
              onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, t)}
              onClick={() => setPickerTask(t)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`flex-shrink-0 max-w-[180px] cursor-grab active:cursor-grabbing
                px-3 py-2 rounded-xl ring-1 text-right text-xs font-medium
                ${priorityRing[t.priority] || priorityRing.medium}
                hover:shadow-sm transition-all`}
              aria-label={`תזמן ${t.title}`}
            >
              <p className="truncate">{t.title}</p>
              {t.deadline && (
                <p className="text-[10px] opacity-70 truncate mt-0.5">{t.deadline}</p>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {pickerTask && (
        <TaskSchedulePicker
          task={pickerTask}
          token={token}
          onClose={() => setPickerTask(null)}
          onSaved={(u) => onTaskUpdate(u)}
        />
      )}
    </>
  );
}
