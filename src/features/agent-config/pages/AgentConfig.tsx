import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Save, Loader2, RotateCcw, Info, History, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Layout } from "@/shared/components/layout/Layout";
import { apiFetchConfig, apiSaveConfig, DEFAULT_SYSTEM_PROMPT, apiFetchCustomPrompt, apiSaveCustomPrompt } from "@/core/utils/storage";
import { apiFetch } from "@/core/api/apiClient";
import { toast } from "sonner";

interface PromptHistoryEntry {
  id: string;
  systemPrompt: string;
  changedBy: string;
  createdAt: string;
}

const SCHEMA_HINT = `// Expected JSON output schema:
{
  "summary": "string",
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "assignee": "Advisor" | "Client",
      "priority": "High" | "Medium" | "Low"
    }
  ]
}`;

export default function AgentConfig() {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Custom behavioral prompt (per-advisor)
  const [customPrompt, setCustomPrompt] = useState("");
  const [customDirty, setCustomDirty] = useState(false);
  const [customSaving, setCustomSaving] = useState(false);

  // FE-031: Version history state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetchConfig().catch(() => ({ systemPrompt: DEFAULT_SYSTEM_PROMPT })),
      apiFetchCustomPrompt().catch(() => ""),
    ]).then(([config, custom]) => {
      setPrompt(config.systemPrompt);
      setCustomPrompt(custom);
      setDirty(false);
      setCustomDirty(false);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await apiSaveConfig({ systemPrompt: prompt });
      setDirty(false);
      toast.success("Agent configuration saved");
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCustom() {
    setCustomSaving(true);
    try {
      await apiSaveCustomPrompt(customPrompt);
      setCustomDirty(false);
      toast.success("Behavioral customization saved");
    } catch {
      toast.error("Failed to save customization");
    } finally {
      setCustomSaving(false);
    }
  }

  function handleReset() {
    setPrompt(DEFAULT_SYSTEM_PROMPT);
    setDirty(true);
  }

  async function handleToggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && history.length === 0) {
      setHistoryLoading(true);
      try {
        const res = await apiFetch("/api/config/history");
        if (!res.ok) throw new Error("Failed to fetch history");
        const data: PromptHistoryEntry[] = await res.json();
        setHistory(data);
      } catch {
        toast.error("Failed to load version history");
      } finally {
        setHistoryLoading(false);
      }
    }
  }

  return (
    <Layout
      title="Agent Configuration"
      subtitle="Define how the AI interprets and extracts insights from meeting recordings"
    >
      <div className="max-w-3xl w-full space-y-6">
        {/* Info card */}
        <Card className="border-indigo-100 bg-indigo-50/50 shadow-sm">
          <CardContent className="px-5 py-4 flex gap-3">
            <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-sm text-indigo-800 leading-relaxed">
              The system prompt instructs the AI how to analyze each recording. It must direct the
              model to output a <code className="bg-indigo-100 px-1 rounded text-xs">JSON</code>{" "}
              object with <code className="bg-indigo-100 px-1 rounded text-xs">summary</code> and{" "}
              <code className="bg-indigo-100 px-1 rounded text-xs">tasks</code> fields. The assignee
              must be{" "}
              <code className="bg-indigo-100 px-1 rounded text-xs">"Advisor"</code> or{" "}
              <code className="bg-indigo-100 px-1 rounded text-xs">"Client"</code>, and priority
              must be{" "}
              <code className="bg-indigo-100 px-1 rounded text-xs">"High"</code>,{" "}
              <code className="bg-indigo-100 px-1 rounded text-xs">"Medium"</code>, or{" "}
              <code className="bg-indigo-100 px-1 rounded text-xs">"Low"</code>.
            </div>
          </CardContent>
        </Card>

        {/* Main editor */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Bot className="h-4 w-4 text-indigo-500" />
              System Prompt
              {dirty && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Unsaved changes
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="relative">
                <label htmlFor="agent-system-prompt" className="sr-only">System Prompt</label>
                <textarea
                  id="agent-system-prompt"
                  value={prompt}
                  onChange={(e) => { setPrompt(e.target.value); setDirty(true); }}
                  dir="rtl"
                  rows={18}
                  className="w-full rounded-lg border border-slate-200 bg-slate-950 px-4 py-3.5 text-sm leading-7 text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none shadow-inner"
                  placeholder={t("agentConfig.promptPlaceholder")}
                  spellCheck={false}
                />
                <div className="absolute bottom-3 left-3 text-[10px] text-slate-600 font-mono">
                  {prompt.length} chars
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 text-slate-500 border-slate-200 hover:text-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to Default
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !dirty}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Behavioral Customization — per-advisor custom prompt injected as preamble */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <Bot className="h-4 w-4 text-emerald-500" />
              Behavioral Customization
              {customDirty && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Unsaved changes
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Define your advisor persona here (e.g. <em>"Act as a strict mortgage advisor focused on risk assessment."</em>).
              This is prepended to the shared system prompt — it controls <strong>tone and focus</strong>, while the system
              prompt ensures the AI outputs valid JSON that the app can parse.
            </p>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="relative">
                <label htmlFor="advisor-custom-prompt" className="sr-only">
                  Behavioral Customization Prompt
                </label>
                <textarea
                  id="advisor-custom-prompt"
                  value={customPrompt}
                  onChange={(e) => { setCustomPrompt(e.target.value); setCustomDirty(true); }}
                  rows={6}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm leading-7 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none shadow-inner"
                  placeholder="e.g. Act as a conservative mortgage advisor. Focus on risk. Be concise."
                  spellCheck={false}
                />
                <div className="absolute bottom-3 left-3 text-[10px] text-slate-400 font-mono">
                  {customPrompt.length} chars
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              {customPrompt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setCustomPrompt(""); setCustomDirty(true); }}
                  className="gap-1.5 text-slate-500 border-slate-200 hover:text-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSaveCustom}
                disabled={customSaving || !customDirty}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                {customSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Customization
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* FE-031: Version History */}
        <Card className="border-slate-200 shadow-sm">
          <button
            type="button"
            onClick={handleToggleHistory}
            className="w-full flex items-center gap-2 px-5 py-4 text-left hover:bg-slate-50 transition-colors rounded-t-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
            aria-expanded={historyOpen}
          >
            {historyOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            )}
            <History className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-800">Version History</span>
          </button>
          {historyOpen && (
            <CardContent className="px-5 pb-5 pt-0 border-t border-slate-100">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No history entries found.</p>
              ) : (
                <ul className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
                  {history.map((entry) => (
                    <li key={entry.id} className="rounded-lg border border-slate-100 bg-slate-50">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                        }
                        aria-expanded={expandedEntry === entry.id}
                        aria-label={`Version from ${new Date(entry.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} by ${entry.changedBy}`}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                      >
                        {expandedEntry === entry.id ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-slate-600">
                              {new Date(entry.createdAt).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="text-[10px] text-slate-400" aria-hidden="true">·</span>
                            <span className="text-[11px] text-slate-500 truncate">{entry.changedBy}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {entry.systemPrompt.slice(0, 100)}
                            {entry.systemPrompt.length > 100 ? "…" : ""}
                          </p>
                        </div>
                      </button>
                      {expandedEntry === entry.id && (
                        <div className="px-4 pb-3">
                          <label htmlFor={`history-prompt-${entry.id}`} className="sr-only">
                            Prompt version from {new Date(entry.createdAt).toLocaleString("en-GB")}
                          </label>
                          <textarea
                            id={`history-prompt-${entry.id}`}
                            readOnly
                            value={entry.systemPrompt}
                            rows={8}
                            dir="rtl"
                            className="w-full rounded-md border border-slate-200 bg-slate-950 px-3 py-2.5 text-xs leading-6 text-slate-300 font-mono resize-none focus:outline-none"
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          )}
        </Card>

        {/* Schema reference */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="px-5 pt-4 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Expected Output Schema
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <pre className="rounded-lg bg-slate-950 px-4 py-4 text-xs text-slate-300 font-mono leading-relaxed overflow-x-auto">
              {SCHEMA_HINT}
            </pre>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
