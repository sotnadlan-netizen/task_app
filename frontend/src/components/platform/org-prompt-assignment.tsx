"use client";

/**
 * Org Prompt Assignment — lets a Platform Admin pick which system prompts an
 * organization may choose from. Saved as a full replacement set via
 * PUT /api/organizations/{orgId}/assigned-prompts.
 */

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";
import type { SystemPrompt } from "@/types";
import { Save, Sparkles, FileText } from "lucide-react";

export function OrgPromptAssignment({ orgId }: { orgId: string }) {
  const { session } = useSupabase();
  const { t } = useLanguage();
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = session?.access_token ?? "";
    try {
      const [all, current] = await Promise.all([
        api.listSystemPrompts(token) as Promise<SystemPrompt[]>,
        api.getOrgAssignedPrompts(orgId, token),
      ]);
      setPrompts(all);
      const set = new Set(current);
      setAssigned(new Set(set));
      setInitial(new Set(set));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("prompts.errLoadPanel"));
    }
    setLoading(false);
  }, [session, orgId]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    setAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isDirty =
    assigned.size !== initial.size || [...assigned].some((id) => !initial.has(id));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.setOrgAssignedPrompts(orgId, [...assigned], session?.access_token ?? "");
      setInitial(new Set(assigned));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("prompts.errSaveAssignment"));
    }
    setSaving(false);
  };

  return (
    <Card padding={false}>
      <div className="p-6 pb-4 flex items-center justify-between border-b border-[#dddbda]">
        <CardHeader className="mb-0"><CardTitle>{t("prompts.availableTitle")}</CardTitle></CardHeader>
        <Button size="sm" onClick={handleSave} loading={saving} disabled={!isDirty}>
          <Save className="w-4 h-4 me-1" />{t("common.save")}
        </Button>
      </div>

      <p className="px-6 pt-4 text-sm text-gray-500">
        {t("prompts.assignDesc")}
      </p>

      {error && <div className="px-6 pt-3"><Alert variant="error">{error}</Alert></div>}
      {success && <div className="px-6 pt-3"><Alert variant="success">{t("prompts.assignmentSaved")}</Alert></div>}

      {loading ? (
        <div className="px-6 py-8 text-center text-sm text-gray-400 animate-pulse">{t("prompts.loading")}</div>
      ) : prompts.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{t("prompts.noPromptsExist")}</p>
        </div>
      ) : (
        <div className="p-6 space-y-2">
          {prompts.map((p) => (
            <label
              key={p.id}
              className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all
                ${assigned.has(p.id)
                  ? "border-[#0070d2] bg-[#ecf5fe]"
                  : "border-[#dddbda] hover:bg-[#fafaf9]"}`}
            >
              <input
                type="checkbox"
                checked={assigned.has(p.id)}
                onChange={() => toggle(p.id)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#0070d2] shrink-0" />
                  {p.name}
                </p>
                {p.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </Card>
  );
}
