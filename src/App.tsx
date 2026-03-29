import { useEffect, useLayoutEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageTransition from "@/components/PageTransition";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProviderDashboard from "./pages/provider/ProviderDashboard";
import ProviderBoard from "./pages/provider/ProviderBoard";
import ProviderClients from "./pages/provider/ProviderClients";
import ProviderTasks from "./pages/provider/ProviderTasks";
import AgentConfig from "./pages/AgentConfig";
import ProviderAnalytics from "./pages/provider/ProviderAnalytics";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientBoard from "./pages/client/ClientBoard";
import NotFound from "./pages/NotFound";
import { AccessibilityWidget } from "@/components/AccessibilityWidget";

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

        {/* Provider routes */}
        <Route element={<ProtectedRoute requiredRole="provider" />}>
          <Route path="/provider/dashboard"          element={<PageTransition><ProviderDashboard /></PageTransition>} />
          <Route path="/provider/board/:sessionId"   element={<PageTransition><ProviderBoard /></PageTransition>} />
          <Route path="/provider/clients"            element={<PageTransition><ProviderClients /></PageTransition>} />
          <Route path="/provider/tasks"              element={<PageTransition><ProviderTasks /></PageTransition>} />
          <Route path="/provider/config"             element={<PageTransition><AgentConfig /></PageTransition>} />
          <Route path="/provider/analytics"          element={<PageTransition><ProviderAnalytics /></PageTransition>} />
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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppBootstrap />
      <AccessibilityWidget />
      <Toaster />
      <Sonner richColors position="top-right" />
      <BrowserRouter>
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
