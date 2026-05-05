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
import type { SystemPrompt } from "@/types";
import { Save, Sparkles, X } from "lucide-react";

export function PromptSelector() {
  const { session } = useSupabase();
  const { currentOrg } = useOrganization();
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load prompts (org admin only sees name + description)
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await api.listSystemPrompts(
        session?.access_token ?? ""
      )) as SystemPrompt[];
      setPrompts(data);
    } catch {
      setError("Failed to load system prompts");
    }
    setLoading(false);
  }, [session]);

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
      setError(err instanceof Error ? err.message : "Failed to save selection");
    }
    setSaving(false);
  };

  const isDirty = selected !== (currentOrg?.selected_prompt_id ?? null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global System Prompt</CardTitle>
      </CardHeader>

      <p className="text-sm text-gray-500 mb-4">
        Select a platform-provided prompt to use for all recordings in this organization.
        This overrides your local prompt version.
        Org admins can read the <strong>name</strong> and <strong>description</strong> only —
        the underlying system text is managed exclusively by platform admins.
      </p>

      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      {success && <Alert variant="success" className="mb-3">Prompt selection saved.</Alert>}

      {loading ? (
        <div className="animate-pulse text-sm text-gray-400 py-4">Loading prompts...</div>
      ) : prompts.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4">
          No system prompts have been created by the platform admin yet.
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {/* "None" option — use local prompt_versions */}
          <label
            className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all
              ${selected === null
                ? "border-violet-300 bg-violet-50/60"
                : "border-violet-100 hover:bg-white/60"}`}
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
                Use local prompt
                {selected === null && <Badge variant="success">Active</Badge>}
              </p>
              <p className="text-xs text-gray-500">Fall back to the org-specific prompt you configured below.</p>
            </div>
          </label>

          {prompts.map((p) => (
            <label
              key={p.id}
              className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all
                ${selected === p.id
                  ? "border-violet-300 bg-violet-50/60"
                  : "border-violet-100 hover:bg-white/60"}`}
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
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  {p.name}
                  {selected === p.id && <Badge variant="success">Active</Badge>}
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
            <X className="w-4 h-4 mr-1" />Discard
          </Button>
        )}
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!isDirty}
          size="sm"
        >
          <Save className="w-4 h-4 mr-1" />Save Selection
        </Button>
      </div>
    </Card>
  );
}
