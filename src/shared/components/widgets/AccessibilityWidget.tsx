import { useEffect, useRef, useState } from "react";
import { Accessibility, X, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/shared/components/ui/sheet";
import { cn } from "@/core/utils/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type FontScale = 100 | 120 | 150 | 200;

interface A11ySettings {
  highContrast: boolean;
  grayscale: boolean;
  fontSize: FontScale;
  highlightLinks: boolean;
  focusRing: boolean;
  stopAnimations: boolean;
  bigCursor: boolean;
  readableFont: boolean;
  readingGuide: boolean;
}

const DEFAULT_SETTINGS: A11ySettings = {
  highContrast:   false,
  grayscale:      false,
  fontSize:       100,
  highlightLinks: false,
  focusRing:      false,
  stopAnimations: false,
  bigCursor:      false,
  readableFont:   false,
  readingGuide:   false,
};

const STORAGE_KEY = "a11y-settings";

function loadSettings(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: A11ySettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ─── Apply / remove CSS classes on <html> ────────────────────────────────────

function applySettings(s: A11ySettings) {
  const cl = document.documentElement.classList;

  cl.toggle("a11y-high-contrast",   s.highContrast);
  cl.toggle("a11y-grayscale",       s.grayscale && !s.highContrast);
  cl.toggle("a11y-highlight-links", s.highlightLinks);
  cl.toggle("a11y-focus-ring",      s.focusRing);
  cl.toggle("a11y-stop-animations", s.stopAnimations);
  cl.toggle("a11y-big-cursor",      s.bigCursor);
  cl.toggle("a11y-readable-font",   s.readableFont);

  // Font size — remove all, then apply active
  (["a11y-font-120", "a11y-font-150", "a11y-font-200"] as const).forEach((c) => cl.remove(c));
  if (s.fontSize === 120) cl.add("a11y-font-120");
  else if (s.fontSize === 150) cl.add("a11y-font-150");
  else if (s.fontSize === 200) cl.add("a11y-font-200");
}

// ─── Reading Guide ────────────────────────────────────────────────────────────

function ReadingGuide() {
  const [y, setY] = useState(-100);

  useEffect(() => {
    const handler = (e: MouseEvent) => setY(e.clientY);
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 z-[9998] h-8 -translate-y-1/2"
      style={{
        top: y,
        background: "rgba(255, 255, 0, 0.25)",
        borderTop:    "2px solid rgba(255, 220, 0, 0.7)",
        borderBottom: "2px solid rgba(255, 220, 0, 0.7)",
      }}
    />
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <label htmlFor={id} className="flex-1 cursor-pointer">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
        {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 shrink-0",
          checked ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 start-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
          )}
        />
        <span className="sr-only">{checked ? "פעיל" : "כבוי"}</span>
      </button>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-4 mb-1">
      {children}
    </h3>
  );
}

// ─── Font Size Picker ─────────────────────────────────────────────────────────

function FontSizePicker({ value, onChange }: { value: FontScale; onChange: (v: FontScale) => void }) {
  const OPTIONS: { label: string; val: FontScale }[] = [
    { label: "רגיל", val: 100 },
    { label: "120%", val: 120 },
    { label: "150%", val: 150 },
    { label: "200%", val: 200 },
  ];

  return (
    <div className="py-2.5 border-b border-slate-100 dark:border-slate-800">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">הגדלת טקסט</p>
      <div className="flex gap-2" role="group" aria-label="גודל טקסט">
        {OPTIONS.map(({ label, val }) => (
          <button
            key={val}
            aria-pressed={value === val}
            onClick={() => onChange(val)}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[36px] no-min-height",
              value === val
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function AccessibilityWidget() {
  const [open, setOpen]       = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(loadSettings);
  const fabRef                = useRef<HTMLButtonElement>(null);

  // Apply settings on mount + whenever they change
  useEffect(() => {
    applySettings(settings);
    saveSettings(settings);
  }, [settings]);

  function update<K extends keyof A11ySettings>(key: K, value: A11ySettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function resetAll() {
    setSettings({ ...DEFAULT_SETTINGS });
  }

  const activeCount = [
    settings.highContrast,
    settings.grayscale,
    settings.fontSize !== 100,
    settings.highlightLinks,
    settings.focusRing,
    settings.stopAnimations,
    settings.bigCursor,
    settings.readableFont,
    settings.readingGuide,
  ].filter(Boolean).length;

  return (
    <>
      {/* Reading Guide overlay */}
      {settings.readingGuide && <ReadingGuide />}

      {/* FAB */}
      <button
        ref={fabRef}
        onClick={() => setOpen(true)}
        aria-label="תפריט נגישות"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "fixed bottom-20 md:bottom-6 end-4 z-[9990]",
          "h-14 w-14 rounded-full shadow-lg",
          "bg-indigo-600 hover:bg-indigo-700 text-white",
          "flex items-center justify-center transition-colors",
          "focus-visible:outline focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-2",
          "no-min-height"
        )}
      >
        <Accessibility className="h-6 w-6" aria-hidden="true" />
        {activeCount > 0 && (
          <span
            className="absolute -top-1 -end-1 h-5 w-5 rounded-full bg-amber-400 text-[10px] font-bold text-slate-900 flex items-center justify-center"
            aria-label={`${activeCount} הגדרות נגישות פעילות`}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-80 max-w-full flex flex-col gap-0 p-0 overflow-hidden"
          aria-label="הגדרות נגישות"
        >
          {/* Header */}
          <SheetHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <SheetTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Accessibility className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              הגדרות נגישות
            </SheetTitle>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  onClick={resetAll}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600 transition-colors no-min-height h-7 px-2 rounded"
                  aria-label="איפוס כל הגדרות הנגישות"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  איפוס
                </button>
              )}
              <SheetClose asChild>
                <button
                  aria-label="סגור תפריט נגישות"
                  className="h-8 w-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors no-min-height"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </SheetClose>
            </div>
          </SheetHeader>

          {/* Settings — scrollable */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <SectionHeading>ויזואלי</SectionHeading>

            <ToggleRow
              id="a11y-high-contrast"
              label="ניגודיות גבוהה"
              description="רקע כהה עם טקסט בצהוב/לבן"
              checked={settings.highContrast}
              onChange={(v) => update("highContrast", v)}
            />
            <ToggleRow
              id="a11y-grayscale"
              label="גווני אפור"
              description="הסרת צבעים לנגישות עיוורי צבעים"
              checked={settings.grayscale}
              onChange={(v) => update("grayscale", v)}
            />
            <FontSizePicker
              value={settings.fontSize}
              onChange={(v) => update("fontSize", v)}
            />
            <ToggleRow
              id="a11y-highlight-links"
              label="הדגשת קישורים וכפתורים"
              description="מסגרת כחולה סביב אלמנטים אינטראקטיביים"
              checked={settings.highlightLinks}
              onChange={(v) => update("highlightLinks", v)}
            />

            <SectionHeading>ניווט ומיקוד</SectionHeading>

            <ToggleRow
              id="a11y-focus-ring"
              label="מסגרת מיקוד מוגברת"
              description="טבעת פוקוס רחבה 3px לניווט מקלדת"
              checked={settings.focusRing}
              onChange={(v) => update("focusRing", v)}
            />
            <ToggleRow
              id="a11y-stop-animations"
              label="עצור אנימציות"
              description="ביטול כל האנימציות והמעברים (בטיחות אפילפסיה)"
              checked={settings.stopAnimations}
              onChange={(v) => update("stopAnimations", v)}
            />
            <ToggleRow
              id="a11y-big-cursor"
              label="סמן גדול"
              description="הגדלת הסמן לנגישות ויזואלית"
              checked={settings.bigCursor}
              onChange={(v) => update("bigCursor", v)}
            />

            <SectionHeading>כלי תוכן</SectionHeading>

            <ToggleRow
              id="a11y-readable-font"
              label="גופן קריא"
              description="החלפה לגופן Assistant/Arial לקריאות מוגברת"
              checked={settings.readableFont}
              onChange={(v) => update("readableFont", v)}
            />
            <ToggleRow
              id="a11y-reading-guide"
              label="קו קריאה"
              description="קו אופקי עוקב אחר הסמן לריכוז קריאה"
              checked={settings.readingGuide}
              onChange={(v) => update("readingGuide", v)}
            />
          </div>

          {/* Footer — accessibility statement */}
          <div className="shrink-0 px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <a
              href="/accessibility"
              className="text-xs text-indigo-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2 rounded"
            >
              הצהרת נגישות
            </a>
            <p className="text-[10px] text-slate-400 mt-1">
              האתר עומד בתקן ישראלי 5568 ו-WCAG 2.1 AA
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
