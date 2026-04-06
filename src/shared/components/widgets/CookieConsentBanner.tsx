import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/core/utils/utils";

const STORAGE_KEY = "cookie-consent";

type ConsentStatus = "accepted" | "declined" | null;

function loadConsent(): ConsentStatus {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "accepted" || val === "declined") return val;
  } catch { /* ignore */ }
  return null;
}

/**
 * Cookie Consent Banner — non-intrusive bottom bar.
 * Persists user choice in localStorage; does not reappear once dismissed.
 * Compliant with IS 5568 and Israeli cookie regulation requirements.
 */
export function CookieConsentBanner() {
  const [status, setStatus] = useState<ConsentStatus>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = loadConsent();
    if (stored === null) {
      // Small delay so the banner doesn't flash immediately on load
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
    setStatus(stored);
  }, []);

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setStatus("accepted");
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    setStatus("declined");
    setVisible(false);
  }

  if (!visible || status !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="הסכמה לשימוש בעוגיות"
      aria-live="polite"
      dir="rtl"
      className={cn(
        "fixed bottom-0 inset-x-0 z-[9980]",
        // Above mobile bottom nav (which is ~56px), below accessibility FAB
        "pb-[env(safe-area-inset-bottom)] md:pb-0",
        "border-t border-slate-200 dark:border-slate-700",
        "bg-white dark:bg-slate-900 shadow-lg",
        "animate-in slide-in-from-bottom duration-300"
      )}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3">
        {/* Text */}
        <p className="flex-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          אנו משתמשים בקבצי Cookie לשיפור חוויית השימוש, אבטחת הגישה, ושמירת הגדרות. המשך השימוש באתר מהווה הסכמה למדיניות הפרטיות שלנו.{" "}
          <a
            href="/accessibility"
            className="text-indigo-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 rounded"
          >
            מדיניות פרטיות
          </a>
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAccept}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold",
              "bg-indigo-600 hover:bg-indigo-700 text-white",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2",
              "transition-colors"
            )}
          >
            אני מסכים/ה
          </button>
          <button
            onClick={handleDecline}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold",
              "border border-slate-300 dark:border-slate-600",
              "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-500 focus-visible:outline-offset-2",
              "transition-colors"
            )}
          >
            דחייה
          </button>
          {/* Dismiss without explicit choice */}
          <button
            onClick={handleDecline}
            aria-label="סגור באנר עוגיות"
            className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center",
              "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
              "hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-500"
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
