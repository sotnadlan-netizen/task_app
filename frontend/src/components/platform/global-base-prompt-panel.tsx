"use client";

/**
 * Global Base Prompt — the platform-wide "how to do the job" prompt that is
 * ALWAYS applied, with any org's chosen mission prompt layered on top.
 * Platform admins only. Falls back to the in-code default until first saved.
 */

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";
import { Save, Globe } from "lucide-react";

export function GlobalBasePromptPanel() {
  const { session } = useSupabase();
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getGlobalPrompt(session?.access_token ?? "");
      setText(data.system_text);
      setIsDefault(data.is_default);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("prompts.errLoadBase"));
    }
    setLoading(false);
  }, [session, t]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.updateGlobalPrompt(text.trim(), session?.access_token ?? "");
      setIsDefault(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("prompts.errSaveBase"));
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#0070d2]" />
            {t("prompts.baseTitle")}
            {isDefault && <Badge variant="default">{t("prompts.baseDefaultBadge")}</Badge>}
          </span>
        </CardTitle>
      </CardHeader>

      <p className="text-sm text-gray-500 mb-4">{t("prompts.baseDesc")}</p>

      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      {success && <Alert variant="success" className="mb-3">{t("prompts.baseSaved")}</Alert>}

      {loading ? (
        <div className="animate-pulse text-sm text-gray-400 py-4">{t("prompts.loading")}</div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            minLength={10}
            className="w-full px-4 py-3 text-sm border border-[#dddbda] rounded
              focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent
              font-mono resize-y bg-white"
            placeholder={t("prompts.basePlaceholder")}
          />
          <div className="flex justify-end mt-3">
            <Button onClick={handleSave} loading={saving} disabled={!text.trim()}>
              <Save className="w-4 h-4 me-1" />{t("prompts.baseSave")}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
