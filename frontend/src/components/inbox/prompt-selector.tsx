"use client";

/**
 * Prompt Selector — lets an Org Admin choose one of the platform-wide
 * system prompts for their org.
 *
 * Security: the API returns only `name` and `description` for non-platform-admins.
 * The `system_text` is NEVER sent to this component.
 */

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";
import type { SystemPrompt } from "@/types";
import { Save, Sparkles, X } from "lucide-react";

export function PromptSelector() {
  const { session } = useSupabase();
  const { currentOrg } = useOrganization();
  const { t } = useLanguage();
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load prompts available to THIS org (name + description only — never system_text).
  const load = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    setError(null);
    try {
      const data = (await api.listAvailablePrompts(
        currentOrg.id,
        session?.access_token ?? ""
      )) as SystemPrompt[];
      setPrompts(data);
    } catch {
      setError(t("prompts.errLoad"));
    }
    setLoading(false);
  }, [session, currentOrg, t]);

  useEffect(() => { load(); }, [load]);

  // Sync initial selection from currentOrg
  useEffect(() => {
    setSelected(currentOrg?.selected_prompt_id ?? null);
  }, [currentOrg]);

  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.selectOrgPrompt(currentOrg.id, selected, session?.access_token ?? "");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("prompts.errSaveSelection"));
    }
    setSaving(false);
  };

  const isDirty = selected !== (currentOrg?.selected_prompt_id ?? null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("prompts.globalTitle")}</CardTitle>
      </CardHeader>

      <p className="text-sm text-gray-500 mb-4">
        {t("prompts.selectorDesc")}
      </p>

      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      {success && <Alert variant="success" className="mb-3">{t("prompts.selectionSaved")}</Alert>}

      {loading ? (
        <div className="animate-pulse text-sm text-gray-400 py-4">{t("prompts.loading")}</div>
      ) : prompts.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4">
          {t("prompts.noneAssigned")}
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {/* "None" option — global base prompt only, no mission overlay */}
          <label
            className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all
              ${selected === null
                ? "border-[#0070d2] bg-[#ecf5fe]"
                : "border-[#dddbda] hover:bg-[#fafaf9]"}`}
          >
            <input
              type="radio"
              name="system-prompt"
              checked={selected === null}
              onChange={() => setSelected(null)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                {t("prompts.useLocal")}
                {selected === null && <Badge variant="success">{t("prompts.active")}</Badge>}
              </p>
              <p className="text-xs text-gray-500">{t("prompts.useLocalDesc")}</p>
            </div>
          </label>

          {prompts.map((p) => (
            <label
              key={p.id}
              className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all
                ${selected === p.id
                  ? "border-[#0070d2] bg-[#ecf5fe]"
                  : "border-[#dddbda] hover:bg-[#fafaf9]"}`}
            >
              <input
                type="radio"
                name="system-prompt"
                checked={selected === p.id}
                onChange={() => setSelected(p.id)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#0070d2] shrink-0" />
                  {p.name}
                  {selected === p.id && <Badge variant="success">{t("prompts.active")}</Badge>}
                </p>
                {p.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {isDirty && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelected(currentOrg?.selected_prompt_id ?? null)}
          >
            <X className="w-4 h-4 me-1" />{t("common.discard")}
          </Button>
        )}
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!isDirty}
          size="sm"
        >
          <Save className="w-4 h-4 me-1" />{t("prompts.saveSelection")}
        </Button>
      </div>
    </Card>
  );
}
