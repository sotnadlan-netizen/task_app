import { Component, useLayoutEffect } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { Toaster } from "@/shared/components/ui/toaster";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { AuthProvider } from "@/core/state/AuthContext";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import PageTransition from "@/shared/components/layout/PageTransition";
import Login from '@/features/auth/pages/Login';
import AuthCallback from '@/features/auth/pages/AuthCallback';
import Signup from '@/features/auth/pages/Signup';
import ForgotPassword from '@/features/auth/pages/ForgotPassword';
import ResetPassword from '@/features/auth/pages/ResetPassword';
import ProviderDashboard from '@/features/dashboard/pages/ProviderDashboard';
import ProviderBoard from '@/features/tasks/pages/ProviderBoard';
import ProviderClients from '@/features/clients/pages/ProviderClients';
import ProviderTasks from '@/features/tasks/pages/ProviderTasks';
import AgentConfig from '@/features/agent-config/pages/AgentConfig';
import ProviderAnalytics from '@/features/analytics/pages/ProviderAnalytics';
import ClientProfile from '@/features/clients/pages/ClientProfile';
import ClientDashboard from '@/features/sessions/pages/ClientDashboard';
import ClientBoard from '@/features/sessions/pages/ClientBoard';
import FeaturesPage from '@/pages/FeaturesPage';
import AccessibilityStatement from '@/pages/AccessibilityStatement';
import NotFound from '@/pages/NotFound';
import { AccessibilityWidget } from "@/shared/components/widgets/AccessibilityWidget";
import { CookieConsentBanner } from "@/shared/components/widgets/CookieConsentBanner";
import { Sentry } from "@/core/config/sentry";

// ── React Error Boundary — catches render/lifecycle errors ────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error);
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-8 bg-background text-foreground text-center">
          <p className="text-xl font-bold">משהו השתבש</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {this.state.error instanceof Error
              ? this.state.error.message
              : "אירעה שגיאה בלתי צפויה."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            רענן את הדף
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

/** Applies persisted dark mode, dir, language, and high-contrast preferences
 *  BEFORE first paint using useLayoutEffect to prevent white flash. */
function AppBootstrap() {
  useLayoutEffect(() => {
    // Dark mode
    const savedTheme = localStorage.getItem('theme');
    if (
      savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // High-contrast mode
    if (localStorage.getItem('hc') === '1') {
      document.documentElement.classList.add('hc');
    }

    // Language + direction
    const savedLng = localStorage.getItem('lng') ?? 'he';
    const dir = savedLng === 'he' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', savedLng);

    // Sync i18n library
    import('@/i18n').then(({ default: i18n }) => {
      if (i18n.language !== savedLng) i18n.changeLanguage(savedLng);
    });
  }, []);

  return null;
}

/** Inner component so useLocation can run inside BrowserRouter */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login"          element={<PageTransition><Login /></PageTransition>} />
        <Route path="/auth/callback"  element={<PageTransition><AuthCallback /></PageTransition>} />
        <Route path="/signup"         element={<PageTransition><Signup /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password"  element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/accessibility"   element={<PageTransition><AccessibilityStatement /></PageTransition>} />

        {/* Provider routes */}
        <Route element={<ProtectedRoute requiredRole="provider" />}>
          <Route path="/provider/dashboard"          element={<PageTransition><ProviderDashboard /></PageTransition>} />
          <Route path="/provider/board/:sessionId"   element={<PageTransition><ProviderBoard /></PageTransition>} />
          <Route path="/provider/clients"            element={<PageTransition><ProviderClients /></PageTransition>} />
          <Route path="/provider/tasks"              element={<PageTransition><ProviderTasks /></PageTransition>} />
          <Route path="/provider/config"             element={<PageTransition><AgentConfig /></PageTransition>} />
          <Route path="/provider/analytics"          element={<PageTransition><ProviderAnalytics /></PageTransition>} />
          <Route path="/provider/clients/:clientEmail" element={<PageTransition><ClientProfile /></PageTransition>} />
          <Route path="/features"                    element={<PageTransition><FeaturesPage /></PageTransition>} />
        </Route>

        {/* Client routes */}
        <Route element={<ProtectedRoute requiredRole="client" />}>
          <Route path="/client/dashboard"          element={<PageTransition><ClientDashboard /></PageTransition>} />
          <Route path="/client/board/:sessionId"   element={<PageTransition><ClientBoard /></PageTransition>} />
        </Route>

        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppBootstrap />
        <AccessibilityWidget />
        <CookieConsentBanner />
        <Toaster />
        <Sonner richColors position="top-right" />
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <AnimatedRoutes />
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
