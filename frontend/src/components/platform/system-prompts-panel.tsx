"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";
import type { SystemPrompt } from "@/types";
import { Plus, Pencil, Trash2, Save, FileText } from "lucide-react";

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function PromptFormModal({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: SystemPrompt | null;
}) {
  const { session } = useSupabase();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemText, setSystemText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDescription(editing.description);
      setSystemText(editing.system_text ?? "");
    } else {
      setName("");
      setDescription("");
      setSystemText("");
    }
    setError(null);
  }, [editing, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const token = session?.access_token ?? "";

    try {
      if (editing) {
        await api.updateSystemPrompt(editing.id, { name, description, system_text: systemText }, token);
      } else {
        await api.createSystemPrompt({ name, description, system_text: systemText }, token);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("prompts.errSavePrompt"));
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? t("prompts.formEditTitle") : t("prompts.formNewTitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("prompts.nameLabel")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            placeholder={t("prompts.namePlaceholder")}
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("prompts.descLabel")} <span className="text-gray-400 font-normal">{t("prompts.descHint")}</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder={t("prompts.descPlaceholder")}
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("prompts.systemTextLabel")} <span className="text-gray-400 font-normal">{t("prompts.systemTextHint")}</span>
          </label>
          <textarea
            value={systemText}
            onChange={(e) => setSystemText(e.target.value)}
            required
            minLength={10}
            rows={10}
            placeholder={t("prompts.systemTextPlaceholder")}
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm font-mono focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent resize-y bg-white"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4 me-1" />
            {editing ? t("common.saveChanges") : t("prompts.createPrompt")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeletePromptModal({
  open,
  onClose,
  prompt,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  prompt: SystemPrompt;
  onDeleted: () => void;
}) {
  const { session } = useSupabase();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteSystemPrompt(prompt.id, session?.access_token ?? "");
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("prompts.errDelete"));
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("prompts.deleteTitle")}>
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <Alert variant="warning">
          {t("prompts.deleteConfirm", { name: prompt.name })}
        </Alert>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="danger" onClick={handleDelete} loading={loading}>
            <Trash2 className="w-4 h-4 me-1" />{t("common.delete")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
export function SystemPromptsPanel() {
  const { session } = useSupabase();
  const { t } = useLanguage();
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SystemPrompt | null>(null);
  const [deleting, setDeleting] = useState<SystemPrompt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listSystemPrompts(session?.access_token ?? "") as SystemPrompt[];
      setPrompts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("prompts.errLoadPanel"));
    }
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Card padding={false}>
        <div className="p-6 pb-4 flex items-center justify-between">
          <CardHeader>
            <CardTitle>{t("prompts.panelTitle")}</CardTitle>
          </CardHeader>
          <Button
            size="sm"
            onClick={() => { setEditing(null); setShowForm(true); }}
          >
            <Plus className="w-4 h-4 me-1" />{t("prompts.newPrompt")}
          </Button>
        </div>

        {error && <div className="px-6 pb-4"><Alert variant="error">{error}</Alert></div>}

        {loading ? (
          <div className="px-6 pb-8 text-center">
            <div className="animate-pulse text-sm text-gray-400">{t("prompts.loading")}</div>
          </div>
        ) : prompts.length === 0 ? (
          <div className="px-6 pb-8 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{t("prompts.noneYet")}</p>
            <Button className="mt-4" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 me-1" />{t("prompts.createFirst")}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[#dddbda]">
            {prompts.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-[#fafaf9] transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    <Badge variant="default">{t("prompts.promptBadge")}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {p.description || <span className="italic">{t("prompts.noDescription")}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditing(p); setShowForm(true); }}
                    className="p-1.5 rounded text-gray-300 hover:text-[#0070d2] hover:bg-[#ecf5fe] transition-colors"
                    title={t("common.edit")}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(p)}
                    className="p-1.5 rounded text-gray-300 hover:text-[#c23934] hover:bg-[#fde9e7] transition-colors"
                    title={t("common.delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <PromptFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        editing={editing}
      />

      {deleting && (
        <DeletePromptModal
          open={!!deleting}
          onClose={() => setDeleting(null)}
          prompt={deleting}
          onDeleted={load}
        />
      )}
    </>
  );
}
