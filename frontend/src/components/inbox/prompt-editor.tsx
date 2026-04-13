"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import type { PromptVersion } from "@/types";
import { Save, History, RotateCcw } from "lucide-react";

export function PromptEditor() {
  const { supabase, session } = useSupabase();
  const { currentOrg } = useOrganization();
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [promptText, setPromptText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadVersions = useCallback(async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from("prompt_versions")
      .select("*, creator:profiles!prompt_versions_created_by_fkey(*)")
      .eq("org_id", currentOrg.id)
      .order("version", { ascending: false });

    if (data && data.length > 0) {
      setVersions(data as PromptVersion[]);
      const active = data.find((v: PromptVersion) => v.is_active);
      setPromptText(active?.prompt_text || data[0].prompt_text);
    } else {
      setPromptText(DEFAULT_PROMPT);
    }
  }, [supabase, currentOrg]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleSave = async () => {
    if (!currentOrg || !promptText.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Deactivate all current versions
      await supabase
        .from("prompt_versions")
        .update({ is_active: false })
        .eq("org_id", currentOrg.id);

      // Insert new version
      const nextVersion =
        versions.length > 0 ? Math.max(...versions.map((v) => v.version)) + 1 : 1;

      const { error: insertError } = await supabase
        .from("prompt_versions")
        .insert({
          org_id: currentOrg.id,
          version: nextVersion,
          prompt_text: promptText.trim(),
          created_by: session?.user?.id,
          is_active: true,
        });

      if (insertError) throw insertError;

      setSuccess(true);
      loadVersions();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prompt");
    } finally {
      setSaving(false);
    }
  };

  const restoreVersion = (version: PromptVersion) => {
    setPromptText(version.prompt_text);
    setShowHistory(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI System Prompt</CardTitle>
        <div className="flex items-center gap-2">
          {versions.length > 0 && (
            <Badge>v{versions[0]?.version || 1}</Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-4 h-4 mr-1" />
            History
          </Button>
        </div>
      </CardHeader>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && (
        <Alert variant="success" className="mb-4">
          Prompt saved as new version.
        </Alert>
      )}

      <textarea
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        rows={10}
        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          font-mono resize-y"
        placeholder="Enter your AI system prompt..."
      />

      <div className="flex justify-end mt-3">
        <Button onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4 mr-1" />
          Save New Version
        </Button>
      </div>

      {/* Version History Panel */}
      {showHistory && versions.length > 0 && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Version History
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">v{v.version}</span>
                    {v.is_active && <Badge variant="success">Active</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {v.creator?.full_name || "Unknown"} &middot;{" "}
                    {new Date(v.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => restoreVersion(v)}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

const DEFAULT_PROMPT = `You are a meeting assistant AI. Analyze the provided audio transcription and extract:

1. **Title**: A concise title for the meeting/session.
2. **Summary**: A brief summary of the key points discussed (2-4 sentences).
3. **Sentiment**: The overall tone of the meeting (positive, neutral, negative, mixed).
4. **Tasks**: A list of actionable tasks extracted from the discussion. For each task include:
   - title: Short, actionable task title
   - description: Detailed description of what needs to be done
   - priority: low, medium, high, or critical

Respond in valid JSON format only.`;
