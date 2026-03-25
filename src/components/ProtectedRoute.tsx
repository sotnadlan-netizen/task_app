import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  requiredRole: "provider" | "client";
}

export default function ProtectedRoute({ requiredRole }: Props) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role !== requiredRole) {
    return (
      <Navigate
        to={role === "provider" ? "/provider/dashboard" : "/client/dashboard"}
        replace
      />
    );
  }

  return <Outlet />;
}
