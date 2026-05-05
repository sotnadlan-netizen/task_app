"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import type { Task } from "@/types";

interface TaskEditRequestFormProps {
  task: Task;
  token: string;
  onClose: () => void;
}

const EDITABLE_FIELDS = [
  { key: "title", label: "כותרת" },
  { key: "description", label: "תיאור" },
  { key: "priority", label: "עדיפות" },
  { key: "status", label: "סטטוס" },
] as const;

export function TaskEditRequestForm({
  task,
  token,
  onClose,
}: TaskEditRequestFormProps) {
  const [field, setField] = useState<string>(EDITABLE_FIELDS[0].key);
  const [newValue, setNewValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.createEditRequest(
        {
          task_id: task.id,
          field_changed: field,
          old_value: String(task[field as keyof Task] || ""),
          new_value: newValue.trim(),
        },
        token
      );
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שליחת הבקשה נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Alert variant="success" className="mt-3">
        בקשת העריכה נשלחה לאישור.
      </Alert>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-3 bg-violet-50/60 rounded-2xl border border-violet-100 space-y-3"
      dir="rtl"
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        בקשת עריכה
      </p>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">שדה</label>
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-violet-100 rounded-2xl focus:ring-2 focus:ring-violet-200 focus:border-transparent bg-white/80"
          >
            {EDITABLE_FIELDS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">
            נוכחי: {String(task[field as keyof Task] || "—")}
          </label>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="ערך חדש"
            className="w-full px-3 py-2 text-sm border border-violet-100 rounded-2xl focus:ring-2 focus:ring-violet-200 focus:border-transparent bg-white/80"
            required
          />
        </div>
      </div>

      <div className="flex gap-2 justify-start">
        <Button type="submit" size="sm" loading={submitting}>
          שלח בקשה
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
