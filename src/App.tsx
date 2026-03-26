import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProviderDashboard from "./pages/provider/ProviderDashboard";
import ProviderBoard from "./pages/provider/ProviderBoard";
import AgentConfig from "./pages/AgentConfig";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientBoard from "./pages/client/ClientBoard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors position="top-right" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Provider routes */}
            <Route element={<ProtectedRoute requiredRole="provider" />}>
              <Route path="/provider/dashboard" element={<ProviderDashboard />} />
              <Route path="/provider/board/:sessionId" element={<ProviderBoard />} />
              <Route path="/provider/config" element={<AgentConfig />} />
            </Route>

            {/* Client routes */}
            <Route element={<ProtectedRoute requiredRole="client" />}>
              <Route path="/client/dashboard" element={<ClientDashboard />} />
              <Route path="/client/board/:sessionId" element={<ClientBoard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
