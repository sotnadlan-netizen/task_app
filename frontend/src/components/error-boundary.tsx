"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Class-based React error boundary. Catches render-time crashes in its subtree,
 * shows a fallback UI, and forwards the error to `onError` (used to log a
 * `system_error` ticket). Hooks aren't available here, so the surrounding
 * `ErrorBoundaryProvider` injects the auth/org context via props.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface in the console and hand off for logging — never let the handler throw.
    console.error("ErrorBoundary caught:", error, info);
    try {
      this.props.onError?.(error, info);
    } catch {
      /* logging must not crash the fallback */
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function ErrorFallback() {
  const { t } = useLanguage();
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#fde9e7] text-[#c23934] flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-[#080707] mb-1">
          {t("tickets.crashTitle")}
        </h2>
        <p className="text-sm text-[#706e6b] mb-5">{t("tickets.crashBody")}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-semibold rounded bg-[#0070d2] text-white border border-[#0070d2] hover:bg-[#005fb2] transition-colors"
        >
          {t("tickets.crashReload")}
        </button>
      </div>
    </div>
  );
}

/**
 * Wraps children in an ErrorBoundary and wires crash logging to the tickets API.
 * On an unhandled render error it silently files a `system_error` ticket
 * (priority `critical`) with the stack trace + browser info in `metadata`.
 */
export function ErrorBoundaryProvider({ children }: { children: ReactNode }) {
  const { session } = useSupabase();
  const { currentOrg } = useOrganization();

  const handleError = (error: Error, info: ErrorInfo) => {
    const token = session?.access_token;
    // Only loggable for an authenticated user within an org.
    if (!token || !currentOrg) return;

    api
      .createTicket(
        {
          org_id: currentOrg.id,
          type: "system_error",
          title: error.message || "Unhandled error",
          description: error.stack?.split("\n")[0] ?? "",
          priority: "critical",
          metadata: {
            stack: error.stack ?? null,
            componentStack: info.componentStack ?? null,
            url: typeof window !== "undefined" ? window.location.href : null,
            userAgent:
              typeof navigator !== "undefined" ? navigator.userAgent : null,
          },
        },
        token
      )
      .catch(() => {
        /* fire-and-forget — never surface logging failures to the user */
      });
  };

  return (
    <ErrorBoundary fallback={<ErrorFallback />} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}
