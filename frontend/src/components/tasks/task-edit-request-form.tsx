"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";
import type { Task } from "@/types";

interface TaskEditRequestFormProps {
  task: Task;
  token: string;
  onClose: () => void;
}

const EDITABLE_FIELDS = [
  { key: "title", labelKey: "editRequest.fieldTitle" },
  { key: "description", labelKey: "editRequest.fieldDescription" },
  { key: "priority", labelKey: "editRequest.fieldPriority" },
  { key: "status", labelKey: "editRequest.fieldStatus" },
] as const;

export function TaskEditRequestForm({
  task,
  token,
  onClose,
}: TaskEditRequestFormProps) {
  const { t } = useLanguage();
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
      setError(err instanceof Error ? err.message : t("editRequest.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Alert variant="success" className="mt-3">
        {t("editRequest.sent")}
      </Alert>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-3 bg-[#fafaf9] rounded border border-[#dddbda] space-y-3"
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {t("editRequest.title")}
      </p>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">{t("editRequest.fieldLabel")}</label>
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white"
          >
            {EDITABLE_FIELDS.map((f) => (
              <option key={f.key} value={f.key}>
                {t(f.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">
            {t("editRequest.current", { value: String(task[field as keyof Task] || "—") })}
          </label>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={t("editRequest.newValuePlaceholder")}
            className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white"
            required
          />
        </div>
      </div>

      <div className="flex gap-2 justify-start">
        <Button type="submit" size="sm" loading={submitting}>
          {t("editRequest.submit")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
