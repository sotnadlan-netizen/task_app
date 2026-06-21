"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { buildGoogleCalendarUrlForTask } from "@/lib/calendar-url";
import { suggestScheduleForTask } from "@/lib/calendar";
import { useLanguage } from "@/providers/language-provider";
import { localeOf } from "@/lib/i18n";
import type { Session, Task } from "@/types";
import { CalendarClock, CalendarPlus, Sparkles, Trash2 } from "lucide-react";

function toDatetimeLocal(iso: string | null, defaultDate?: string): string {
  if (!iso) {
    if (defaultDate) return `${defaultDate}T09:00`;
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return formatLocal(d);
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return formatLocal(d);
}

function formatLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  task: Task;
  token: string;
  /** The task's meeting — used to suggest a smart default time. */
  owningSession?: Session | null;
  defaultDate?: string; // YYYY-MM-DD; used as 09:00 of this day when task is unscheduled
  onClose: () => void;
  onSaved: (updated: Task) => void;
}

export function TaskSchedulePicker({ task, token, owningSession, defaultDate, onClose, onSaved }: Props) {
  const { t, lang } = useLanguage();
  // AI-suggested time from the meeting / deadline — only when the task is not
  // already scheduled and no explicit day was passed by the caller.
  const suggestion = useMemo(
    () => (task.scheduled_at || defaultDate ? null : suggestScheduleForTask(task, owningSession)),
    [task, owningSession, defaultDate]
  );
  const [value, setValue] = useState<string>(() => suggestion ?? toDatetimeLocal(task.scheduled_at, defaultDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (clear: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = clear
        ? { scheduled_at: "" }
        : { scheduled_at: new Date(value).toISOString() };
      const updated = await api.updateTask(task.id, payload, token) as Task;
      onSaved({ ...task, ...updated, scheduled_at: clear ? null : new Date(value).toISOString() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("schedule.errUpdate"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t("schedule.title")}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-[#ecf5fe] border border-[#b3d9f6] rounded">
          <CalendarClock className="w-5 h-5 text-[#0070d2] flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-gray-800 mb-0.5">{task.title}</p>
            {task.deadline && (
              <p className="text-xs text-gray-500">{t("schedule.deadlineFromCall", { deadline: task.deadline })}</p>
            )}
          </div>
        </div>

        {suggestion && suggestion !== value && (
          <button
            type="button"
            onClick={() => setValue(suggestion)}
            className="flex items-center gap-2 w-full text-start p-2.5 rounded border border-[#cfe3fa] bg-[#f4f9fe] hover:bg-[#ecf5fe] transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[#0070d2] flex-shrink-0" />
            <span className="text-xs text-[#3e3e3c]">
              {t("schedule.useSuggestion", {
                when: new Date(suggestion).toLocaleString(localeOf(lang), {
                  weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                }),
              })}
            </span>
          </button>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("schedule.dateTime")}
          </label>
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            dir="ltr"
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0070d2]/40 focus:border-transparent bg-white"
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {task.scheduled_at && (() => {
          const gcalUrl = buildGoogleCalendarUrlForTask(task);
          return gcalUrl ? (
            <a
              href={gcalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#0070d2] hover:bg-[#005fb2] text-white text-sm font-medium transition-all shadow-sm"
            >
              <CalendarPlus className="w-4 h-4" />
              {t("schedule.addToGoogleCalendar")}
            </a>
          ) : null;
        })()}

        <div className="flex justify-between gap-3 pt-2">
          <div className="flex gap-2">
            <Button onClick={() => save(false)} loading={saving} disabled={!value}>
              <CalendarClock className="w-4 h-4 me-1" />
              {t("common.save")}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </Button>
          </div>
          {task.scheduled_at && (
            <Button type="button" variant="danger" onClick={() => save(true)} disabled={saving}>
              <Trash2 className="w-4 h-4 me-1" />
              {t("schedule.clearSchedule")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
