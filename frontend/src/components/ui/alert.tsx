import type { ReactNode } from "react";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";

type AlertVariant = "info" | "success" | "warning" | "error";

const variantStyles: Record<AlertVariant, string> = {
  info: "bg-blue-50/80 border-blue-100 text-blue-700",
  success: "bg-emerald-50/80 border-emerald-100 text-emerald-700",
  warning: "bg-amber-50/80 border-amber-100 text-amber-700",
  error: "bg-red-50/80 border-red-100 text-red-600",
};

const icons: Record<AlertVariant, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  className = "",
}: AlertProps) {
  const Icon = icons[variant];

  return (
    <div
      role="alert"
      className={`flex gap-3 p-4 rounded-2xl border ${variantStyles[variant]} ${className}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
