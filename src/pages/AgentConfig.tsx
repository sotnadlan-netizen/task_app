import { useEffect, useState } from "react";
import { Bot, Save, Loader2, RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { apiFetchConfig, apiSaveConfig, DEFAULT_SYSTEM_PROMPT } from "@/lib/storage";
import { toast } from "sonner";

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
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    apiFetchConfig()
      .then((c) => { setPrompt(c.systemPrompt); setDirty(false); })
      .catch(() => { setPrompt(DEFAULT_SYSTEM_PROMPT); })
      .finally(() => setLoading(false));
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

  function handleReset() {
    setPrompt(DEFAULT_SYSTEM_PROMPT);
    setDirty(true);
  }

  return (
    <Layout
      title="Agent Configuration"
      subtitle="Define how the AI interprets and extracts insights from meeting recordings"
    >
      <div className="max-w-3xl space-y-6">
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
                <textarea
                  value={prompt}
                  onChange={(e) => { setPrompt(e.target.value); setDirty(true); }}
                  dir="rtl"
                  rows={18}
                  className="w-full rounded-lg border border-slate-200 bg-slate-950 px-4 py-3.5 text-sm leading-7 text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none shadow-inner"
                  placeholder="הזן הוראות לסוכן ה-AI..."
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
