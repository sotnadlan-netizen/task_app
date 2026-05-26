"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";

const PRIORITIES = ["low", "medium", "high", "critical"] as const;

/**
 * Reusable support form. Files a `manual_complaint` ticket for the current org
 * through the FastAPI backend (api.createTicket).
 */
export function SupportTicketForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const { t } = useLanguage();
  const { session } = useSupabase();
  const { currentOrg } = useOrganization();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = session?.access_token || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentOrg) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.createTicket(
        {
          org_id: currentOrg.id,
          type: "manual_complaint",
          title: title.trim(),
          description: description.trim(),
          priority,
        },
        token
      );
      setTitle("");
      setDescription("");
      setPriority("medium");
      setSuccess(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tickets.errSubmit"));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Alert variant="success" title={t("tickets.submittedTitle")}>
        <p>{t("tickets.submittedBody")}</p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={() => setSuccess(false)}
        >
          {t("tickets.submitAnother")}
        </Button>
      </Alert>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white rounded border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] p-5"
    >
      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <label className="block text-sm font-medium text-[#3e3e3c] mb-1">
          {t("tickets.subjectLabel")}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("tickets.subjectPlaceholder")}
          required
          maxLength={300}
          className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#3e3e3c] mb-1">
          {t("tickets.descriptionLabel")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("tickets.descriptionPlaceholder")}
          rows={4}
          className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent resize-none bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#3e3e3c] mb-1">
          {t("tickets.priorityLabel")}
        </label>
        <select
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value as (typeof PRIORITIES)[number])
          }
          className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {t(`tickets.priority_${p}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 justify-start">
        <Button type="submit" loading={submitting} disabled={!title.trim()}>
          {t("tickets.submit")}
        </Button>
      </div>
    </form>
  );
}
